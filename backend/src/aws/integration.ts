import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { query } from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";
import type { AWSIntegration } from "../types/index.js";

const stsClient = new STSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_PLATFORM_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_PLATFORM_SECRET_ACCESS_KEY || "",
  },
});

export async function generateExternalId(): Promise<string> {
  return uuidv4();
}

export async function createAWSIntegration(
  user_id: string,
  role_arn: string,
  region: string = "ap-south-1"
): Promise<AWSIntegration> {
  const id = uuidv4();
  const external_id = generateExternalId();

  const result = await query(
    `INSERT INTO aws_integrations (id, user_id, role_arn, external_id, region) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, user_id, role_arn, external_id, region, verified_at, created_at`,
    [id, user_id, role_arn, external_id, region]
  );

  return result.rows[0];
}

export async function verifyAWSIntegration(
  user_id: string,
  integration_id: string,
  role_arn: string,
  external_id: string
): Promise<boolean> {
  try {
    const command = new AssumeRoleCommand({
      RoleArn: role_arn,
      RoleSessionName: `devops-lab-verify-${Date.now()}`,
      ExternalId: external_id,
      DurationSeconds: 900, // 15 minutes
    });

    const response = await stsClient.send(command);

    if (response.Credentials?.AccessKeyId) {
      // Update verification timestamp
      await query(
        `UPDATE aws_integrations SET verified_at = NOW() WHERE id = $1 AND user_id = $2`,
        [integration_id, user_id]
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error("AWS verification error:", error);
    return false;
  }
}

export async function getAWSIntegrationByUser(user_id: string): Promise<AWSIntegration | null> {
  const result = await query(
    `SELECT id, user_id, role_arn, external_id, region, verified_at, created_at 
     FROM aws_integrations WHERE user_id = $1`,
    [user_id]
  );

  return result.rows[0] || null;
}

export async function getAWSIntegrationById(
  user_id: string,
  integration_id: string
): Promise<AWSIntegration | null> {
  const result = await query(
    `SELECT id, user_id, role_arn, external_id, region, verified_at, created_at 
     FROM aws_integrations WHERE id = $1 AND user_id = $2`,
    [integration_id, user_id]
  );

  return result.rows[0] || null;
}
