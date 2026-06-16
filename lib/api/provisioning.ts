import { apiClient } from "./client";

export interface StartLabResponse {
  sessionId: string;
  environmentId: string;
  durableObjectId: string;
  mode: "full_provision" | "scenario_switch";
  websocketUrl: string;
  labName: string;
  expiresAt: string;
  sshHostname?: string;
  createdAt?: string;
  timeoutAt?: string;
  terminalUrl?: string;
  terminalToken?: string;
  status?: string;
}

export interface SessionStatusResponse {
  id: string;
  lab_id: string;
  status: string;
  environment_id: string | null;
  expires_at: string | null;
  environment_status: string | null;
  terraform_module: string | null;
  created_at: string;
  completed_at: string | null;
  timeout_at?: string;
  terminalUrl?: string;
  terminalToken?: string;
  websocketUrl?: string;
  tunnel_hostname?: string;
  terminal_token?: string;
  statusCode?: string;
}

export async function startLab(labSlug: string) {
  return apiClient.post<StartLabResponse>(`/labs/${labSlug}/start`, {});
}

export async function getLabStatus(sessionId: string) {
  return apiClient.get<SessionStatusResponse>(`/labs/${sessionId}/status`);
}

/**
 * Recover active session for a lab
 * Returns existing session if user has one in progress
 */
export async function recoverLabSession(labSlug: string) {
  return apiClient.get<StartLabResponse>(`/labs/${labSlug}/session/active`);
}

/** Ends the current session only; shared environment stays up. */
export async function stopLabSession(sessionId: string) {
  return apiClient.post<{ status: string }>(`/labs/${sessionId}/stop`, {});
}

/** Queues a validation job for an active session. */
export async function runValidation(sessionId: string) {
  return apiClient.post<{ status: string }>(`/labs/${sessionId}/validate`, {});
}
