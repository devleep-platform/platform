# Durable Objects
variable "durable_object_url" {
  description = "Cloudflare Durable Objects URL"
  type        = string
  default     = "https://api.devops-lab.com"
}

# Container Apps
variable "container_registry_sku" {
  description = "Container Registry SKU"
  type        = string
  default     = "Basic"
}

variable "worker_cpu" {
  description = "CPU allocation for Worker"
  type        = string
  default     = "0.5"
}

variable "worker_memory" {
  description = "Memory allocation for Worker"
  type        = string
  default     = "1Gi"
}

# AWS Platform Credentials
variable "aws_platform_access_key_id" {
  description = "AWS Platform Account Access Key ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_platform_secret_access_key" {
  description = "AWS Platform Account Secret Access Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token for tunnel management"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_tunnel_base_domain" {
  description = "Base domain for tunnel subdomains (e.g., tunnel.example.com)"
  type        = string
  default     = ""
}

