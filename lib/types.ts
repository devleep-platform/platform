export type CloudProvider = "aws" | "azure";

export type LabStatus =
  | "provisioning"
  | "active"
  | "validating"
  | "completed"
  | "failed";

export type Track = {
  id: string;
  name: string;
  description: string;
  level: "Foundational" | "Intermediate" | "Advanced";
  labCount: number;
  completedCount: number;
  estimatedHours: number;
};

export type ValidationCheck = {
  id: string;
  type: "ssh_command" | "http_get" | "process" | "file_exists" | "k8s_resource" | "aws_api";
  command?: string;
  url?: string;
  process_name?: string;
  path?: string;
  kind?: string;
  name?: string;
  namespace?: string;
  service?: string;
  action?: string;
  expected_contains?: string;
  expected_status?: number;
  expected?: string;
  timeout_seconds: number;
  failure_hint?: string;
};

export type LabHint = {
  level: number;
  text: string;
};

export type ValidationResult = {
  id: string;
  objectiveId: string;
  label: string;
  status: "pending" | "passed" | "failed";
  message: string;
};

export type LabTemplate = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  terraform_module: string;
  scenario_id?: string;
  content: {
    objectives: string[];
    hint_policy: string;
    hints: LabHint[];
    validation: {
      strategy: string;
      default_timeout_seconds: number;
      checks: Array<{
        id: string;
        name?: string;
        type: string;
        cmd?: string;
        url?: string;
        failure_hint?: string;
        [key: string]: unknown;
      }>;
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
  outputs_mapping: Record<string, string>;
  estimated_minutes: number;
  timeout_minutes: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LabInstance = {
  id: string;
  templateId: string;
  status: LabStatus;
  startedAt: string;
  ttlSeconds: number;
  websocketUrl?: string;
  validationResults: ValidationResult[];
};

export type LabHistoryItem = {
  id: string;
  labTitle: string;
  trackName: string;
  cloud: CloudProvider;
  status: "completed" | "expired" | "failed";
  score: number;
  startedAt: string;
  durationMinutes: number;
};

export type CloudAccount = {
  id: string;
  provider: CloudProvider;
  label: string;
  accountId: string;
  status: "verified" | "needs_attention";
  lastVerifiedAt: string;
};
