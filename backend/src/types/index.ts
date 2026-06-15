export interface JWTPayload {
  sub: string; // user ID
  email: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: Date;
}

export interface AWSIntegration {
  id: string;
  user_id: string;
  role_arn: string;
  external_id: string;
  region: string;
  verified_at?: Date;
  created_at: Date;
}

export interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  compatible_modules: string[];
  setup_timeout_seconds: number;
  tags: string[];
}

export interface ScenarioConfig {
  id: string;
  timeout_seconds: number;
}

export interface LabDefinition {
  id: string;
  slug: string;
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  terraform_module: string;
  scenario_id?: string;
  scenario?: ScenarioConfig;
  content: {
    objectives: string[];
    steps: Array<{
      id: string;
      order: number;
      title: string;
      instructions: string;
      hint?: string;
      validation: {
        id: string;
        type: 'ssh_command' | 'http_get' | 'process' | 'file_exists' | 'k8s_resource' | 'aws_api';
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
    }>;
  };
  outputs_mapping: {
    [templateVar: string]: string;
  };
  estimated_minutes: number;
  timeout_minutes: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LabSession {
  id: string;
  user_id: string;
  lab_id: string;
  status: 'provisioning' | 'active' | 'validating' | 'completed' | 'destroying' | 'destroyed' | 'failed';
  do_id?: string;
  tf_state_key?: string;
  terraform_outputs: {
    [outputName: string]: string | number | any;
  };
  score?: number;
  started_at: Date;
  completed_at?: Date;
  destroyed_at?: Date;
  timeout_at?: Date;
  last_activity: Date;
}

export interface ValidationRun {
  id: string;
  session_id: string;
  check_id: string;
  check_type: 'ssh_command' | 'http_get' | 'process' | 'k8s_resource' | 'aws_api' | 'file_exists';
  result: 'pass' | 'fail' | 'error' | 'timeout';
  expected?: string;
  actual?: string;
  duration_ms?: number;
  created_at: Date;
}
