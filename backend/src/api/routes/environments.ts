import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { query } from "../../db/connection.js";
import { publishTeardownEnvironmentJob } from "../../queue/publisher.js";

export async function environmentRoutes(fastify: FastifyInstance) {
  /**
   * GET /environments/active
   * Lists active lab environments for the authenticated user.
   */
  fastify.get(
    "/environments/active",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.sub;

      const result = await query(
        `SELECT id, terraform_module, status, current_scenario, expires_at, created_at
         FROM lab_environments
         WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
      );

      return reply.send({ environments: result.rows });
    }
  );

  /**
   * POST /environments/:environmentId/end
   * Explicitly tears down environment and releases AWS resources.
   */
  fastify.post<{ Params: { environmentId: string } }>(
    "/environments/:environmentId/end",
    { onRequest: [(fastify as any).authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.sub;
      const { environmentId } = request.params as { environmentId: string };

      const envResult = await query(
        `SELECT id, status FROM lab_environments
         WHERE id = $1 AND user_id = $2`,
        [environmentId, userId]
      );

      if (envResult.rows.length === 0) {
        return reply.status(404).send({ error: "Environment not found" });
      }

      if (envResult.rows[0].status === "destroyed") {
        return reply.send({ status: "already_destroyed" });
      }

      const sessionResult = await query(
        `SELECT id, durable_object_id FROM lab_sessions
         WHERE environment_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [environmentId, userId]
      );

      const session = sessionResult.rows[0];

      await publishTeardownEnvironmentJob({
        environmentId,
        userId,
        sessionId: session?.id,
        durableObjectId: session?.durable_object_id,
        reason: "manual_end",
      });

      return reply.send({ status: "teardown_queued" });
    }
  );
}
