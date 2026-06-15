# Local values for Terraform configuration
locals {
  common_tags = merge(
    var.tags,
    {
      "Environment"   = var.environment
      "Terraform"     = "true"
      "LastUpdated"   = timestamp()
    }
  )

  app_name   = "${var.project_name}-${var.environment}-api"
  db_name    = "${var.project_name}-${var.environment}-db"
  rg_name    = "${var.project_name}-${var.environment}-rg"
}

# Configure the backend for state management
# Run: terraform init -backend-config=backend.hcl to use Azure backend
