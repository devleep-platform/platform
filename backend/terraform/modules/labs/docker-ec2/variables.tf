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

variable "nodes" {
  description = "Linux nodes to provision"
  type = list(object({
    name          = string
    role          = string
    instance_type = string
  }))

  default = [
    {
      name          = "primary"
      role          = "primary"
      instance_type = "t3.micro"
    }
  ]
}
