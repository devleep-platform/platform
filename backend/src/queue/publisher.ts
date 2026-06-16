import { ProvisioningJob, ValidationJob } from "./types.js";
import { query } from "../db/connection.js";
import { v4 as uuid } from "uuid";

const ENVIRONMENT_TTL_HOURS = 24;

async function enqueueRiverJob(
  kind: string,
  args: Record<string, unknown>,
  scheduledAt?: Date
): Promise<number> {
  const scheduled = scheduledAt ?? new Date();
  const state = scheduled > new Date() ? "scheduled" : "available";
  const result = await query(
    `INSERT INTO river_job (
      kind, state, args, max_attempts,
      queue, priority, scheduled_at, metadata, tags
    ) VALUES (
      $1, $2, $3, $4,
      'default', 1, $5, '{}', '{}'
    )
    RETURNING id`,
    [kind, state, JSON.stringify(args), 3, scheduled]
  );

  const jobId = result.rows[0].id;
  console.log(`✓ Enqueued ${kind} job in River (job ID: ${jobId})`);
  return jobId;
}

export async function publishProvisionEnvironmentJob(args: {
  environmentId: string;
  sessionId: string;
  userId: string;
  labSlug: string;
  labId: string;
  durableObjectId: string;
  scenarioId?: string;
  terraformModule: string;
  cfTunnelToken: string;
  tunnelId?: string;
  tunnelHostname?: string;
  studentRegion: string;
}): Promise<string> {
  const jobId = uuid();
  await enqueueRiverJob("provision_environment", {
    jobId,
    environmentId: args.environmentId,
    sessionId: args.sessionId,
    userId: args.userId,
    labSlug: args.labSlug,
    labId: args.labId,
    durableObjectId: args.durableObjectId,
    scenarioId: args.scenarioId,
    terraformModule: args.terraformModule,
    cfTunnelToken: args.cfTunnelToken,
    tunnelId: args.tunnelId,
    tunnelHostname: args.tunnelHostname,
    studentRegion: args.studentRegion,
    timestamp: Date.now(),
  });
  return jobId;
}

export async function publishSwitchScenarioJob(args: {
  environmentId: string;
  sessionId: string;
  userId: string;
  durableObjectId: string;
  fromScenarioId?: string;
  toScenarioId?: string;
  tunnelHostname?: string;
}): Promise<string> {
  const jobId = uuid();
  await enqueueRiverJob("switch_scenario", {
    jobId,
    environmentId: args.environmentId,
    sessionId: args.sessionId,
    userId: args.userId,
    durableObjectId: args.durableObjectId,
    fromScenarioId: args.fromScenarioId,
    toScenarioId: args.toScenarioId,
    tunnelHostname: args.tunnelHostname,
    timestamp: Date.now(),
  });
  return jobId;
}

export async function publishTeardownEnvironmentJob(args: {
  environmentId: string;
  userId: string;
  sessionId?: string;
  durableObjectId?: string;
  reason?: string;
}): Promise<void> {
  await enqueueRiverJob("teardown_environment", {
    environmentId: args.environmentId,
    userId: args.userId,
    sessionId: args.sessionId,
    durableObjectId: args.durableObjectId,
    reason: args.reason ?? "manual",
    timestamp: Date.now(),
  });
}

export async function scheduleSessionExpiryJob(
  sessionId: string,
  timeoutAt: Date
): Promise<void> {
  await enqueueRiverJob(
    "expire_session",
    { sessionId, timestamp: Date.now() },
    timeoutAt
  );
}

export async function scheduleEnvironmentExpiryJob(
  environmentId: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  await enqueueRiverJob(
    "expire_environment",
    {
      environmentId,
      userId,
      timestamp: Date.now(),
    },
    expiresAt
  );
}

/** @deprecated Use publishProvisionEnvironmentJob */
export async function publishProvisioningJob(job: ProvisioningJob): Promise<string> {
  return publishProvisionEnvironmentJob({
    environmentId: job.sessionId,
    sessionId: job.sessionId,
    userId: job.userId,
    labSlug: job.labSlug,
    labId: job.labId,
    durableObjectId: job.durableObjectId,
    scenarioId: job.scenarioId,
    terraformModule: job.terraformModule,
    cfTunnelToken: job.cfTunnelToken,
    studentRegion: job.awsRegion,
  });
}

export async function publishValidationJob(job: ValidationJob): Promise<string> {
  const jobId = uuid();
  await enqueueRiverJob("validation", {
    jobId,
    sessionId: job.sessionId,
    userId: job.userId,
    labId: job.labId,
    durableObjectId: job.durableObjectId,
    labContent: job.labContent,
    outputsMapping: job.outputsMapping,
    terraformOutputs: job.terraformOutputs,
    sshHostname: job.sshHostname ?? "",
    environmentId: job.environmentId ?? "",
    timestamp: job.timestamp,
  });
  return jobId;
}

export async function cacheSessionData(
  sessionId: string,
  _data: Record<string, unknown>,
  _ttlSeconds: number = 86400
): Promise<void> {
  console.log(`✓ Session ${sessionId} tracked in lab_sessions`);
}

export async function getSessionData(_sessionId: string): Promise<null> {
  return null;
}

export async function scheduleTeardownJob(
  environmentId: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  await scheduleEnvironmentExpiryJob(environmentId, userId, expiresAt);
}

export function environmentExpiresAt(): Date {
  return new Date(Date.now() + ENVIRONMENT_TTL_HOURS * 60 * 60 * 1000);
}
