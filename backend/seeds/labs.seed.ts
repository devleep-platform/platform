import { readFileSync, readdirSync, statSync } from 'fs';
import yaml from 'js-yaml';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

interface ValidationCheck {
  id: string;
  name?: string;
  type: string;
  cmd?: string;
  url?: string;
  value?: string;
  expect_status?: number;
  operator?: string;
  checks?: ValidationCheck[];
  failure_hint?: string;
  [key: string]: unknown;
}

interface Validation {
  strategy: string;
  default_timeout_seconds: number;
  checks: ValidationCheck[];
}

interface Evidence {
  type: string;
  title?: string;
  content: string;
}

interface Incident {
  detected_at: string;
  severity: string;
  impacted_services: string[];
}

interface Briefing {
  severity: string;
  impact: string;
  title?: string;
  narrative: string;
  incident?: Incident;
}

interface Deliverable {
  path: string;
  description: string;
}

interface Metadata {
  version: string;
  author: string;
  reviewed_by: string[];
  last_updated: string;
}

interface Environment {
  instance_type: string;
  estimated_cost: string;
  aws_services: string[];
}

interface LabYaml {
  schema_version?: number;
  metadata?: Metadata;
  id: string;
  title: string;
  description?: string;
  track?: string;
  module?: string;
  sort_order?: number;
  difficulty: string;
  engineer_level?: string;
  mode?: string;
  tags?: string[];
  estimated_minutes: number;
  timeout_minutes: number;
  terraform_module: string;
  scenario_id?: string;
  environment?: Environment;
  prerequisites?: string[];
  briefing?: Briefing;
  evidence?: Evidence[];
  objectives: string[];
  deliverables?: Deliverable[];
  success_criteria?: string[];
  hint_policy?: string;
  hints: { level: number; text: string }[];
  validation: Validation;
  completion_message?: string;
}

function outputsMappingForModule(module: string): Record<string, string> {
  if (module.includes('linux-ec2')) {
    return { EC2_IP: 'ec2_private_ip', INSTANCE_ID: 'ec2_instance_id' };
  }
  if (module.includes('docker-ec2')) {
    return { EC2_IP: 'private_ip', INSTANCE_ID: 'instance_id' };
  }
  if (module.includes('kubernetes-eks')) {
    return { CLUSTER_ENDPOINT: 'cluster_endpoint', CLUSTER_NAME: 'cluster_name' };
  }
  return { EC2_IP: 'ec2_private_ip' };
}

function collectYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectYamlFiles(fullPath));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadLabsFromDir(dir: string): LabYaml[] {
  const files = collectYamlFiles(dir);

  const labs: LabYaml[] = [];
  for (const fullPath of files) {
    const raw = readFileSync(fullPath, 'utf8');
    const parsed = yaml.load(raw) as LabYaml;
    if (parsed && parsed.id && parsed.title) {
      labs.push(parsed);
    } else {
      console.warn(`  ⚠ Skipping ${fullPath} — missing id or title`);
    }
  }
  return labs;
}

async function seed() {
  const labsDir = join(__dirname, '../../lab-definatations-v1');
  console.log(`Reading labs from: ${labsDir}\n`);

  const labs = loadLabsFromDir(labsDir);
  console.log(`Parsed ${labs.length} labs\n`);

  if (labs.length === 0) {
    console.error('No labs found — check the lab-definatations-v1/ directory.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM validation_runs');
    await client.query('DELETE FROM lab_sessions');
    await client.query('DELETE FROM lab_definitions');

    for (const lab of labs) {
      const id = randomUUID();

      // Normalise validation — new schema is an object; guard against old array shape
      const validation = Array.isArray(lab.validation)
        ? { strategy: 'all', default_timeout_seconds: 5, checks: lab.validation }
        : lab.validation;

      const content = {
        objectives: lab.objectives || [],
        hint_policy: lab.hint_policy || 'show_level_1_automatically',
        hints: lab.hints || [],
        validation,
        track: lab.track || null,
        module: lab.module || null,
        mode: lab.mode || 'guided',
        engineer_level: lab.engineer_level || null,
        tags: lab.tags || [],
        briefing: lab.briefing || null,
        evidence: lab.evidence || [],
        prerequisites: lab.prerequisites || [],
        deliverables: lab.deliverables || [],
        success_criteria: lab.success_criteria || null,
        completion_message: lab.completion_message || null,
        environment: lab.environment || null,
      };

      const outputsMapping = outputsMappingForModule(lab.terraform_module);

      if (lab.sort_order === undefined) {
        console.warn(`  ⚠ ${lab.id} — missing sort_order, defaulting to 9999`);
      }

      await client.query(
        `INSERT INTO lab_definitions (
          id, slug, title, description, difficulty, terraform_module, scenario_id,
          estimated_minutes, timeout_minutes, published, outputs_mapping, content,
          sort_order, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
        [
          id,
          lab.id,
          lab.title,
          lab.description || null,
          lab.difficulty,
          lab.terraform_module,
          lab.scenario_id || null,
          lab.estimated_minutes || 60,
          lab.timeout_minutes || 120,
          true,
          JSON.stringify(outputsMapping),
          JSON.stringify(content),
          lab.sort_order ?? 9999,
        ]
      );

      const checkCount = validation?.checks?.length ?? 0;
      const trackLabel = lab.track ? `${lab.track}/${lab.module || '?'}` : 'no-track';
      console.log(`  ✓ ${lab.id} (${lab.difficulty}, ${lab.mode || 'guided'}, ${trackLabel}, ${checkCount} checks)`);
    }

    await client.query('COMMIT');
    console.log(`\n✓ Seeded ${labs.length} labs successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
