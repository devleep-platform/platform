import { apiClient } from "./client";

export interface LabEnvironment {
  id: string;
  terraform_module: string;
  status: string;
  current_scenario: string | null;
  expires_at: string;
  created_at: string;
}

export async function getActiveEnvironments() {
  return apiClient.get<{ environments: LabEnvironment[] }>("/environments/active");
}

export async function endEnvironment(environmentId: string) {
  return apiClient.post<{ status: string }>(`/environments/${environmentId}/end`);
}
