// Job types for Upstash Redis queue

export interface ProvisioningJob {
  sessionId: string;
  userId: string;
  labSlug: string;
  labId: string;
  durableObjectId: string; // ID of the Durable Object handling WebSocket updates
  scenarioId?: string;     // Optional scenario to inject after terraform apply
  awsRoleArn?: string;
  awsExternalId?: string;
  awsRegion: string;
  terraformModule: string; // e.g., "labs/linux-ec2"
  cfTunnelToken: string;   // CloudFlare Tunnel token for private access
  timestamp: number;
}

export interface ValidationJob {
  sessionId: string;
  userId: string;
  labId: string;
  durableObjectId: string;
  labContent: any;           // JSONB from lab_definitions.content
  outputsMapping: Record<string, string>;      // JSONB from lab_definitions.outputs_mapping
  terraformOutputs: Record<string, any>;       // From lab_sessions.terraform_outputs
  sshHostname?: string;      // Cloudflare tunnel hostname for SSH checks
  environmentId?: string;   // lab_environments.id — used to fetch SSH key in worker
  timestamp: number;
}

export interface JobResult {
  jobId: string;
  status: "success" | "failure" | "pending";
  message: string;
  timestamp: number;
}
