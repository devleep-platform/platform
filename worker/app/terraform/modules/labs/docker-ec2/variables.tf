variable "session_id" {
  description = "Unique lab session ID used for tagging resources"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "cf_tunnel_token" {
  description = "Cloudflare tunnel token"
  type        = string
  sensitive   = true
}

variable "session_token" {
  description = "Random token for ttyd authentication"
  type        = string
  sensitive   = true
}

variable "environment_name" {
  description = "Environment name prefix"
  type        = string
  default     = "devops-lab"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type — t3.small recommended for Docker workloads"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Root volume size in GB — Docker images need more space than Linux labs"
  type        = number
  default     = 30
}
