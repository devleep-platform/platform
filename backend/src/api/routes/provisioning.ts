import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { randomBytes } from "crypto";
import { query } from "../../db/connection.js";
import {
  publishProvisionEnvironmentJob,
  publishSwitchScenarioJob,
  publishValidationJob,
  scheduleEnvironmentExpiryJob,
  scheduleSessionExpiryJob,
  environmentExpiresAt,
} from "../../queue/publisher.js";
import {
  createLabTunnel,
  isCloudflareTunnelConfigured,
} from "../../services/cloudflare-tunnel.js";

const startLabSchema = z.object({});

// Generate a 32-character random hex token for ttyd authentication
function generateSessionToken(): string {
  return randomBytes(16).toString("hex");
}

export async function provisioningRoutes(fastify: FastifyInstance) {
  /**
   * POST /labs/:slug/start
   * Reuses active lab_environment when possible; otherwise provisions fresh infrastructure.
   */
  fastify.post<{ Params: { slug: string } }>(
    "/labs/:slug/start",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;
        const { slug } = request.params as { slug: string };
        startLabSchema.parse(request.body);

        const labResult = await query(
          `SELECT id, title, slug, terraform_module, scenario_id, timeout_minutes
           FROM lab_definitions WHERE slug = $1`,
          [slug]
        );

        if (labResult.rows.length === 0) {
          return reply.status(404).send({ error: "Lab not found" });
        }

        const lab = labResult.rows[0];

        if (!lab.terraform_module) {
          return reply.status(400).send({ error: "Lab does not have terraform module configured" });
        }

        const awsIntResult = await query(
          `SELECT role_arn, external_id, region, verified_at
           FROM aws_integrations
           WHERE user_id = $1 AND verified_at IS NOT NULL`,
          [userId]
        );

        if (awsIntResult.rows.length === 0) {
          return reply.status(400).send({
            error:
              "AWS account not connected. Visit Settings > AWS Integration to connect your account.",
          });
        }

        // ENFORCEMENT: Check for existing active/provisioning sessions
        // Users can only have ONE lab running at a time (prevents resource conflicts)
        const existingSessionResult = await query(
          `SELECT ls.id, ls.lab_id, ls.status, ld.title, ld.slug
           FROM lab_sessions ls
           JOIN lab_definitions ld ON ld.id = ls.lab_id
           WHERE ls.user_id = $1
             AND ls.status IN ('provisioning', 'active', 'scenario_switching')
           LIMIT 1`,
          [userId]
        );

        if (existingSessionResult.rows.length > 0) {
          const existing = existingSessionResult.rows[0];
          // If trying to start a different lab, return conflict
          if (existing.lab_id !== lab.id) {
            return reply.status(409).send({
              error: `You already have an active lab: "${existing.title}". Please end it before starting a new lab.`,
              existingLabSlug: existing.slug,
              existingLabTitle: existing.title,
              existingSessionId: existing.id,
            });
          }
          // If same lab ID but in provisioning, return the existing session
          if (existing.status === 'provisioning' || existing.status === 'scenario_switching') {
            return reply.status(409).send({
              error: "Lab is already provisioning. Please wait for it to complete.",
              existingSessionId: existing.id,
            });
          }
        }

        const sessionId = uuid();
        const durableObjectId = uuid();
        const expiresAt = environmentExpiresAt();
        const timeoutMinutes = lab.timeout_minutes || 120;
        const sessionTimeoutDate = new Date(Date.now() + timeoutMinutes * 60 * 1000);

        const existingEnv = await query(
          `SELECT id, current_scenario, terraform_outputs, expires_at
           FROM lab_environments
           WHERE user_id = $1
             AND terraform_module = $2
             AND status = 'active'
             AND expires_at > NOW()
           LIMIT 1`,
          [userId, lab.terraform_module]
        );

        let environmentId: string;
        let mode: "full_provision" | "scenario_switch";
        let tunnelHostname = "";

        if (existingEnv.rows.length > 0) {
          const env = existingEnv.rows[0];
          environmentId = env.id;
          mode = "scenario_switch";

          const tunnelHostResult = await query(
            `SELECT tunnel_hostname FROM lab_environments WHERE id = $1`,
            [environmentId]
          );
          tunnelHostname = tunnelHostResult.rows[0]?.tunnel_hostname ?? "";

          // Generate a unique session token for ttyd authentication
          const sessionToken = generateSessionToken();

          await query(
            `INSERT INTO lab_sessions
             (id, user_id, lab_id, environment_id, status, durable_object_id, terminal_token, terraform_outputs, timeout_at, created_at)
             VALUES ($1, $2, $3, $4, 'scenario_switching', $5, $6, $7, NOW() + INTERVAL '${timeoutMinutes} minutes', NOW())`,
            [
              sessionId,
              userId,
              lab.id,
              environmentId,
              durableObjectId,
              sessionToken,
              env.terraform_outputs ?? {},
            ]
          );

          await scheduleSessionExpiryJob(sessionId, sessionTimeoutDate);

          await publishSwitchScenarioJob({
            environmentId,
            sessionId,
            userId,
            durableObjectId,
            fromScenarioId: env.current_scenario ?? undefined,
            toScenarioId: lab.scenario_id ?? undefined,
            tunnelHostname,
          });
        } else {
          environmentId = uuid();
          mode = "full_provision";

          let tunnelId = "";
          let tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN || "";
          let dnsRecordId = "";
          let sshDnsRecordId = "";
          tunnelHostname = "";  // No 'let' — use outer variable

          // Use fastify logger so logs are properly captured
          console.log(`[CONSOLE_DEBUG_START] === TUNNEL CREATION DEBUG ===`);
          fastify.log.info(`[PROVISION_DEBUG_START] === TUNNEL CREATION DEBUG ===`);
          fastify.log.info(`[PROVISION_DEBUG_VARS] CF_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? "SET" : "MISSING"}`);
          fastify.log.info(`[PROVISION_DEBUG_VARS] CF_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID || "MISSING"}`);
          fastify.log.info(`[PROVISION_DEBUG_VARS] CF_ZONE_ID: ${process.env.CLOUDFLARE_ZONE_ID || "MISSING"}`);
          fastify.log.info(`[PROVISION_DEBUG_VARS] CF_TUNNEL_BASE_DOMAIN: ${process.env.CLOUDFLARE_TUNNEL_BASE_DOMAIN || "MISSING"}`);
          
          const isTunnelConfigured = isCloudflareTunnelConfigured();
          console.log(`[CONSOLE_DEBUG_RESULT] isCloudflareTunnelConfigured: ${isTunnelConfigured}`);
          fastify.log.info(`[PROVISION_DEBUG_RESULT] isCloudflareTunnelConfigured: ${isTunnelConfigured}`);

          if (isTunnelConfigured) {
            fastify.log.info(`[PROVISION_TUNNEL_STARTING] Environment ${environmentId}`);
            console.log(`[CONSOLE_TUNNEL_START] Creating tunnel for ${environmentId}`);
            try {
              const tunnel = await createLabTunnel(environmentId);
              tunnelId = tunnel.tunnelId;
              tunnelToken = tunnel.tunnelToken;
              tunnelHostname = tunnel.tunnelHostname;
              dnsRecordId = tunnel.dnsRecordId;
              sshDnsRecordId = tunnel.sshDnsRecordId;
              fastify.log.info(`[PROVISION_TUNNEL_SUCCESS] Created tunnel with hostname: ${tunnelHostname}`);
              console.log(`[CONSOLE_TUNNEL_SUCCESS] Created tunnel: ${tunnelHostname}`);
            } catch (tunnelErr: any) {
              fastify.log.error(`[PROVISION_TUNNEL_ERROR] ${tunnelErr?.message || JSON.stringify(tunnelErr)}`);
              console.error(`[CONSOLE_TUNNEL_ERROR] ${tunnelErr?.message || JSON.stringify(tunnelErr)}`);
            }
          } else {
            fastify.log.warn(`[PROVISION_TUNNEL_SKIPPED] Cloudflare not configured`);
            console.log(`[CONSOLE_TUNNEL_SKIPPED] Cloudflare not configured`);
          }

          fastify.log.info(`[PROVISION_INSERT] tunnel_id="${tunnelId}", tunnel_hostname="${tunnelHostname}"`);

          await query(
            `INSERT INTO lab_environments
             (id, user_id, terraform_module, status, current_scenario, tunnel_id, tunnel_hostname, dns_record_id, ssh_dns_record_id, expires_at)
             VALUES ($1, $2, $3, 'provisioning', $4, $5, $6, $7, $8, $9)`,
            [
              environmentId,
              userId,
              lab.terraform_module,
              lab.scenario_id,
              tunnelId || null,
              tunnelHostname || null,
              dnsRecordId || null,
              sshDnsRecordId || null,
              expiresAt,
            ]
          );

          await query(
            `INSERT INTO lab_sessions
             (id, user_id, lab_id, environment_id, status, durable_object_id, timeout_at, created_at)
             VALUES ($1, $2, $3, $4, 'provisioning', $5, NOW() + INTERVAL '${timeoutMinutes} minutes', NOW())`,
            [sessionId, userId, lab.id, environmentId, durableObjectId]
          );

          await publishProvisionEnvironmentJob({
            environmentId,
            sessionId,
            userId,
            labSlug: slug,
            labId: lab.id,
            durableObjectId,
            scenarioId: lab.scenario_id ?? undefined,
            terraformModule: lab.terraform_module,
            cfTunnelToken: tunnelToken,
            tunnelId,
            tunnelHostname,
            studentRegion: awsIntResult.rows[0].region,
          });

          await scheduleEnvironmentExpiryJob(environmentId, userId, expiresAt);
          await scheduleSessionExpiryJob(sessionId, sessionTimeoutDate);
        }

        const sessionCreatedAt = new Date().toISOString();

        return reply.send({
          sessionId,
          environmentId,
          durableObjectId,
          mode,
          websocketUrl: `${process.env.DURABLE_OBJECT_URL}/labs/${durableObjectId}`,
          sshHostname: tunnelHostname || undefined,
          labName: lab.title,
          expiresAt,
          timeoutAt: sessionTimeoutDate.toISOString(),
          createdAt: sessionCreatedAt,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to start lab" });
      }
    }
  );

  /**
   * GET /labs/:slug/session/active
   * Recovery endpoint: returns active/provisioning session for a lab if user has one
   * Allows frontend to restore session on page refresh or browser restoration
   */
  fastify.get<{ Params: { slug: string } }>(
    "/labs/:slug/session/active",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;
        const { slug } = request.params as { slug: string };

        // Get the lab definition
        const labResult = await query(
          `SELECT id FROM lab_definitions WHERE slug = $1`,
          [slug]
        );

        if (labResult.rows.length === 0) {
          return reply.status(404).send({ error: "Lab not found" });
        }

        const labId = labResult.rows[0].id;

        // Check for active/provisioning session for this lab
        const sessionResult = await query(
          `SELECT 
             ls.id, 
             ls.lab_id, 
             ls.status, 
             ls.environment_id, 
             ls.created_at, 
             ls.timeout_at,
             ls.durable_object_id,
             ls.terminal_token,
             le.expires_at, 
             le.terraform_module, 
             le.tunnel_hostname,
             le.status AS environment_status
           FROM lab_sessions ls
           LEFT JOIN lab_environments le ON le.id = ls.environment_id
           WHERE ls.user_id = $1 
             AND ls.lab_id = $2
             AND ls.status IN ('provisioning', 'active', 'scenario_switching')
           ORDER BY ls.created_at DESC
           LIMIT 1`,
          [userId, labId]
        );

        if (sessionResult.rows.length === 0) {
          return reply.status(404).send({ error: "No active session" });
        }

        const sessionData = sessionResult.rows[0];

        // Check if session has expired
        if (sessionData.timeout_at && new Date(sessionData.timeout_at) < new Date()) {
          // Mark as destroyed and return expired error
          await query(
            `UPDATE lab_sessions SET status = 'destroyed', destroyed_at = NOW() WHERE id = $1`,
            [sessionData.id]
          );
          return reply.status(410).send({ 
            error: "Session has expired. Please start a new lab.",
            statusCode: "SESSION_EXPIRED"
          });
        }

        // Build response with terminal info if available
        const response: any = {
          sessionId: sessionData.id,
          status: sessionData.status,
          environmentId: sessionData.environment_id,
          durableObjectId: sessionData.durable_object_id,
          expiresAt: sessionData.expires_at,
          environmentStatus: sessionData.environment_status,
          websocketUrl: `${process.env.DURABLE_OBJECT_URL}/labs/${sessionData.durable_object_id}`,
          sshHostname: sessionData.tunnel_hostname || undefined,
          timeoutAt: sessionData.timeout_at ? new Date(sessionData.timeout_at).toISOString() : undefined,
          createdAt: sessionData.created_at ? new Date(sessionData.created_at).toISOString() : undefined,
        };

        if (sessionData.tunnel_hostname && sessionData.terminal_token) {
          response.terminalUrl = `wss://${sessionData.tunnel_hostname}/ws`;
          response.terminalToken = sessionData.terminal_token;
        }

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to recover session" });
      }
    }
  );

  fastify.get<{ Params: { sessionId: string } }>(
    "/labs/:sessionId/status",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params as { sessionId: string };

        const result = await query(
          `SELECT ls.id, ls.lab_id, ls.status, ls.environment_id, ls.created_at, ls.completed_at,
                  ls.terminal_token, ls.timeout_at, ls.durable_object_id, ls.validation_results,
                  le.expires_at, le.terraform_module, le.tunnel_hostname, le.status AS environment_status
           FROM lab_sessions ls
           LEFT JOIN lab_environments le ON le.id = ls.environment_id
           WHERE ls.id = $1 AND ls.user_id = $2`,
          [sessionId, request.user.sub]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: "Session not found" });
        }

        const sessionData = result.rows[0];

        // Check if session has expired
        if (sessionData.timeout_at && new Date(sessionData.timeout_at) < new Date()) {
          // Mark as destroyed
          await query(
            `UPDATE lab_sessions SET status = 'destroyed', destroyed_at = NOW() WHERE id = $1`,
            [sessionData.id]
          );
          return reply.status(410).send({ 
            error: "Session has expired",
            status: "destroyed",
            statusCode: "SESSION_EXPIRED"
          });
        }
        
        // Build terminal connection info if available
        const response: any = sessionData;
        if (sessionData.tunnel_hostname && sessionData.terminal_token) {
          response.terminalUrl = `wss://${sessionData.tunnel_hostname}/ws`;
          response.terminalToken = sessionData.terminal_token;
        }
        if (sessionData.durable_object_id) {
          response.websocketUrl = `${process.env.DURABLE_OBJECT_URL}/labs/${sessionData.durable_object_id}`;
        }

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch status" });
      }
    }
  );

  /**
   * POST /labs/:sessionId/stop — ends session only; does not destroy environment.
   */
  fastify.post<{ Params: { sessionId: string } }>(
    "/labs/:sessionId/stop",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params as { sessionId: string };

        await query(
          `UPDATE lab_sessions
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [sessionId, request.user.sub]
        );

        return reply.send({ status: "completed" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to stop lab" });
      }
    }
  );

  /**
   * POST /labs/:sessionId/validate — queue a validation job for an active session.
   */
  fastify.post<{ Params: { sessionId: string } }>(
    "/labs/:sessionId/validate",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params as { sessionId: string };
        const userId = (request as any).user.sub;

        const result = await query(
          `SELECT ls.id, ls.lab_id, ls.status, ls.durable_object_id,
                  ls.terraform_outputs, ls.environment_id,
                  ld.content, ld.outputs_mapping,
                  le.tunnel_hostname
           FROM lab_sessions ls
           JOIN lab_definitions ld ON ld.id = ls.lab_id
           LEFT JOIN lab_environments le ON le.id = ls.environment_id
           WHERE ls.id = $1 AND ls.user_id = $2`,
          [sessionId, userId]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: "Session not found" });
        }

        const session = result.rows[0];

        if (session.status !== "active" && session.status !== "completed") {
          return reply.status(400).send({
            error: `Cannot validate a session in '${session.status}' state`,
          });
        }

        await query(
          `UPDATE lab_sessions SET status = 'validating' WHERE id = $1`,
          [sessionId]
        );

        await publishValidationJob({
          sessionId,
          userId,
          labId: session.lab_id,
          durableObjectId: session.durable_object_id,
          labContent: session.content,
          outputsMapping: session.outputs_mapping ?? {},
          terraformOutputs: session.terraform_outputs ?? {},
          sshHostname: session.tunnel_hostname ?? undefined,
          environmentId: session.environment_id ?? undefined,
          timestamp: Date.now(),
        });

        return reply.status(202).send({ status: "validation_queued" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to queue validation" });
      }
    }
  );
}
