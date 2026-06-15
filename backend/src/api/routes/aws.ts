import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuid } from "uuid";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { query } from "../../db/connection.js";
import type { JWTPayload } from "../../types/index.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

// Comprehensive IAM policy for all lab types (connect-once model)
const COMPREHENSIVE_IAM_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "TaggedResourcesOnly",
      Effect: "Allow",
      Action: [
        "ec2:*",
        "eks:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "s3:*",
      ],
      Resource: "*",
      Condition: {
        StringEquals: {
          "aws:ResourceTag/managed-by": "devops-lab-platform",
        },
      },
    },
    {
      Sid: "DescribeAndList",
      Effect: "Allow",
      Action: [
        "ec2:Describe*",
        "ec2:Get*",
        "eks:Describe*",
        "eks:List*",
        "iam:GetRole",
        "iam:ListRoles",
        "sts:GetCallerIdentity",
      ],
      Resource: "*",
    },
    {
      Sid: "PassRoleForEKS",
      Effect: "Allow",
      Action: "iam:PassRole",
      Resource: "*",
      Condition: {
        StringEquals: {
          "iam:PassedToService": "eks.amazonaws.com",
        },
      },
    },
    {
      Sid: "NeverAllowed",
      Effect: "Deny",
      Action: [
        "iam:CreateUser",
        "iam:DeleteUser",
        "iam:AttachUserPolicy",
        "organizations:*",
        "billing:*",
        "budgets:*",
        "account:*",
      ],
      Resource: "*",
    },
  ],
};

export async function awsRoutes(fastify: FastifyInstance) {
  /**
   * POST /aws/connect
   * Initiates AWS account connection - returns policies and setup instructions
   * Reuses external ID if user already has one pending verification
   */
  fastify.post<{ Body: unknown }>(
    "/aws/connect",
    {
      onRequest: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;
        const platformAccountId = process.env.AWS_PLATFORM_ACCOUNT_ID || "123456789012";

        // Check if user already has a pending or verified external ID
        const existingResult = await query(
          `SELECT external_id FROM aws_integrations WHERE user_id = $1`,
          [userId]
        );

        let externalId: string;
        if (existingResult.rows.length > 0) {
          // Reuse existing external ID
          externalId = existingResult.rows[0].external_id;
        } else {
          // Generate new external ID for first-time setup
          externalId = uuid();
          const integrationId = uuid();
          
          // Store the external ID so it persists across page refreshes
          await query(
            `INSERT INTO aws_integrations (id, user_id, role_arn, external_id, region) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE SET external_id = EXCLUDED.external_id`,
            [integrationId, userId, "", externalId, process.env.AWS_REGION || "ap-south-1"]
          );
        }

        // Return policy details and onboarding instructions
        return reply.send({
          externalId,
          platformAccountId,
          trustPolicy: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: `arn:aws:iam::${platformAccountId}:root`,
                },
                Action: "sts:AssumeRole",
                Condition: {
                  StringEquals: {
                    "sts:ExternalId": externalId,
                  },
                },
              },
            ],
          },
          permissionsPolicy: COMPREHENSIVE_IAM_POLICY,
          maxSessionDurationSeconds: 14400,
          maxSessionDurationCommand:
            "aws iam update-role --role-name devops-lab-role --max-session-duration 14400",
          instructions: {
            step1: "Create a new IAM role in your AWS account (e.g. devops-lab-role)",
            step2: "Copy and paste the Trust Policy JSON into the Trust Relationship tab",
            step3: "Create an inline policy and paste the Permissions Policy JSON",
            step4:
              "Set Max session duration to 4 hours (14400 seconds) on the role — required for long provisioning runs",
            step5: "Copy the Role ARN and paste it below to complete setup",
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * POST /aws/verify
   * Verifies AWS role and stores connection in database
   */
  fastify.post<{ Body: { roleArn: string } }>(
    "/aws/verify",
    {
      onRequest: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;
        const { roleArn } = request.body as { roleArn: string };

        if (!roleArn || !roleArn.startsWith("arn:aws:iam::")) {
          return reply.status(400).send({
            error: "Invalid Role ARN format",
          });
        }

        // Check if user already has a verified integration
        const existingResult = await query(
          `SELECT id, external_id FROM aws_integrations WHERE user_id = $1`,
          [userId]
        );

        let externalId = existingResult.rows[0]?.external_id;

        // If no existing integration, generate new external ID
        if (!externalId) {
          externalId = uuid();
        }

        // Test the role assumption
        const sts = new STSClient({
          region: process.env.AWS_REGION || "ap-south-1",
          credentials: {
            accessKeyId: process.env.AWS_PLATFORM_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_PLATFORM_SECRET_ACCESS_KEY || "",
          },
        });

        try {
          const command = new AssumeRoleCommand({
            RoleArn: roleArn,
            RoleSessionName: "devops-lab-platform-test",
            ExternalId: externalId,
            DurationSeconds: 900, // 15 minutes for test
          });

          const response = await sts.send(command);

          if (!response.Credentials) {
            throw new Error("No credentials returned");
          }

          // Test credentials are valid - store the role in database
          if (existingResult.rows.length > 0) {
            // Update existing
            await query(
              `UPDATE aws_integrations 
               SET role_arn = $1, verified_at = NOW()
               WHERE user_id = $2`,
              [roleArn, userId]
            );
          } else {
            // Insert new
            await query(
              `INSERT INTO aws_integrations 
               (user_id, role_arn, external_id, region, verified_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [
                userId,
                roleArn,
                externalId,
                process.env.AWS_REGION || "ap-south-1",
              ]
            );
          }

          return reply.send({
            success: true,
            message: "AWS account connected successfully",
            roleArn,
            region: process.env.AWS_REGION || "ap-south-1",
            verifiedAt: new Date(),
          });
        } catch (stsError: any) {
          return reply.status(400).send({
            error: "Failed to assume role. Check that the Role ARN is correct and the role has the proper trust and permissions policies.",
            details: stsError.message,
          });
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * GET /aws/integration
   * Get current AWS integration status
   */
  fastify.get(
    "/aws/integration",
    {
      onRequest: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;

        const result = await query(
          `SELECT role_arn, region, verified_at FROM aws_integrations WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          return reply.send({
            connected: false,
            message: "No AWS account connected",
          });
        }

        const integration = result.rows[0];

        return reply.send({
          connected: true,
          roleArn: integration.role_arn,
          region: integration.region,
          verifiedAt: integration.verified_at,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * DELETE /aws/integration
   * Disconnect AWS account
   */
  fastify.delete(
    "/aws/integration",
    {
      onRequest: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.sub;

        await query(`DELETE FROM aws_integrations WHERE user_id = $1`, [userId]);

        return reply.send({
          success: true,
          message: "AWS account disconnected",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
