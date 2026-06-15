terraform {
  required_version = ">= 1.0"
}

# Backend configuration for remote state storage in Azure
# To initialize with this backend, run:
# terraform init -backend-config="resource_group_name=<RG>" \
#   -backend-config="storage_account_name=<SA>" \
#   -backend-config="container_name=<CONTAINER>" \
#   -backend-config="key=<KEY>.tfstate"

variable "backend_resource_group_name" {
  description = "Resource group for Terraform state storage"
  type        = string
  default     = "devops-lab-tfstate-rg"
}

variable "backend_storage_account_name" {
  description = "Storage account for Terraform state"
  type        = string
  default     = "devopslabstate"
}

variable "backend_container_name" {
  description = "Container name for Terraform state"
  type        = string
  default     = "tfstate"
}

variable "backend_key" {
  description = "Key/path for Terraform state file"
  type        = string
  default     = "prod.tfstate"
}
