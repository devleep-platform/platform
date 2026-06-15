// lib/api/labs.ts - Lab Catalog API Functions

import { apiClient } from "./client";

export interface LabValidationCheck {
  id: string;
  name?: string;
  type: string;
  cmd?: string;
  url?: string;
  failure_hint?: string;
  [key: string]: unknown;
}

export interface Lab {
  id: string;
  slug: string;
  title: string;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  terraform_module: string;
  scenario_id?: string;
  estimated_minutes: number;
  timeout_minutes: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  outputs_mapping: Record<string, string>;
  content: {
    objectives: string[];
    hint_policy: string;
    hints: Array<{ level: number; text: string }>;
    validation: {
      strategy: string;
      default_timeout_seconds: number;
      checks: LabValidationCheck[];
    };
    briefing: {
      severity: string;
      impact: string;
      title?: string;
      narrative: string;
    } | null;
    evidence: Array<{ type: string; title?: string; content: string }>;
    deliverables: Array<{ path: string; description: string }>;
    success_criteria: string[] | null;
    completion_message: string | null;
    environment: {
      instance_type: string;
      estimated_cost: string;
      aws_services: string[];
    } | null;
    tags: string[];
    track: string | null;
    module: string | null;
    mode: string;
    engineer_level: string | null;
    prerequisites: string[];
  };
}

export async function getAllLabs(
  published: boolean = true
): Promise<{ data?: { labs: Lab[] }; error?: any }> {
  const params = new URLSearchParams();
  if (published) params.append("published", "true");

  return apiClient.get<{ labs: Lab[] }>(`/labs${params.toString() ? "?" + params.toString() : ""}`);
}

export async function getLabBySlug(slug: string): Promise<{ data?: { lab: Lab }; error?: any }> {
  return apiClient.get<{ lab: Lab }>(`/labs/${slug}`);
}

export async function createLab(lab: Omit<Lab, "id" | "created_at">): Promise<{
  data?: { lab: Lab };
  error?: any;
}> {
  return apiClient.post<{ lab: Lab }>("/labs", lab);
}
