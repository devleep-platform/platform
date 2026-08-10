# secrets.tf

# 1. Primary Platform Secrets Store
resource "aws_secretsmanager_secret" "platform_secrets-v2" {
  name        = "devleep/prod/platform-secrets-v2"
  description = "Environment variables and API keys for Devleep API and Worker"

  tags = {
    Name = "devleep-platform-secrets"
  }
}

# 2. Secret Key-Value Pair Placeholders
# Note: You can populate these values via the AWS CLI or Console after deployment
resource "aws_secretsmanager_secret_version" "platform_secrets" {
  secret_id = aws_secretsmanager_secret.platform_secrets-v2.id
  secret_string = jsonencode({
    DATABASE_URL                 = "REPLACE_WITH_YOUR_DATABASE_URL"
    JWT_SECRET                   = "REPLACE_WITH_YOUR_JWT_SECRET"
    CLOUDFLARE_API_TOKEN         = "REPLACE_WITH_CF_TOKEN"
    CLOUDFLARE_ACCOUNT_ID        = "REPLACE_WITH_CF_ACCOUNT_ID"
    CLOUDFLARE_ZONE_ID           = "REPLACE_WITH_CF_ZONE_ID"
    CLOUDFLARE_TUNNEL_BASE_DOMAIN= "tunnel.devleep.com"
    DURABLE_OBJECT_URL          = "https://your-cf-worker.workers.dev"
    AWS_PLATFORM_ACCOUNT_ID      = "YOUR_AWS_ACCOUNT_ID"
    AWS_REGION                   = var.aws_region
    CORS_ORIGIN                  = "https://devleep.com,https://devleep.pages.dev"
  })

  # Ignore changes to values updated manually in Secrets Manager
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# 3. Grant ECS Task Execution Role Access to Read Secrets
data "aws_iam_policy_document" "ecs_secrets_policy" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.platform_secrets-v2.arn,
      aws_secretsmanager_secret.db_credentials.arn
    ]
  }
}

resource "aws_iam_policy" "ecs_secrets_policy" {
  name        = "devleep-ecs-secrets-policy"
  description = "Allows ECS Execution Role to fetch secrets for container env vars"
  policy      = data.aws_iam_policy_document.ecs_secrets_policy.json
}

resource "aws_iam_role_policy_attachment" "ecs_secrets_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.ecs_secrets_policy.arn
}