variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "devops-lab"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "azure_subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  sensitive   = true
}

# App Service Configuration
variable "app_service_sku" {
  description = "App Service Plan SKU"
  type        = string
  default     = "B1"
}

variable "app_service_workers" {
  description = "Number of workers"
  type        = number
  default     = 1
}

# Application Configuration
variable "database_url" {
  description = "PostgreSQL connection string (from Neon)"
  type        = string
  sensitive   = true
  
  validation {
    condition     = startswith(var.database_url, "postgresql://")
    error_message = "Database URL must be a valid PostgreSQL connection string."
  }
}

variable "jwt_secret" {
  description = "JWT secret key for authentication"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters."
  }
}

variable "aws_region" {
  description = "AWS region for AWS integration"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID (optional for AWS integration)"
  type        = string
  default     = ""
}

variable "platform_account_id" {
  description = "Platform AWS account ID for cross-account access"
  type        = string
  default     = ""
}

variable "app_settings" {
  description = "Additional app settings"
  type        = map(string)
  default = {
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
    "ENABLE_ORYX_BUILD"        = "true"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
  }
}

# Monitoring
variable "enable_monitoring" {
  description = "Enable Application Insights monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    "Managed-By" = "Terraform"
    "Project"    = "DevOps-Lab-Platform"
  }
}

# Container Registry Admin Credentials
variable "acr_admin_username" {
  description = "Azure Container Registry admin username"
  type        = string
  sensitive   = true
}

variable "acr_admin_password" {
  description = "Azure Container Registry admin password"
  type        = string
  sensitive   = true
}
