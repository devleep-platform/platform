# Container Registry for storing Docker images
resource "azurerm_container_registry" "this" {
  name                = "devopslab${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = merge(var.tags, { Name = "${var.project_name}-acr" })
}

# Container Apps Environment
resource "azurerm_container_app_environment" "this" {
  name                = "${var.project_name}-${var.environment}-env"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = merge(var.tags, { Name = "${var.project_name}-container-env" })
}

# Orchestrator Container App
resource "azurerm_container_app" "worker" {
  name                         = "${var.project_name}-${var.environment}-worker"
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  

  ingress {
    external_enabled = false
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1   # ← CRITICAL — Worker must never scale to zero
    max_replicas = 3   # scale up for concurrent lab sessions

    container {
      name   = "worker"
      image  = "${azurerm_container_registry.this.login_server}/worker:v80"
      cpu    = 1  
      memory = "2Gi"

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }

      env {
        name  = "DURABLE_OBJECT_URL"
        value = var.durable_object_url
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "LOG_LEVEL"
        value = "debug"
      }

      env {
        name  = "AWS_PLATFORM_ACCESS_KEY_ID"
        value = sensitive("${var.aws_platform_access_key_id}")
      }

      env {
        name  = "AWS_PLATFORM_SECRET_ACCESS_KEY"
        value = sensitive("${var.aws_platform_secret_access_key}")
      }

      env {
        name  = "AWS_PLATFORM_ACCOUNT_ID"
        value = var.platform_account_id
      }

      env {
        name  = "AWS_ACCESS_KEY_ID"
        value = sensitive("${var.aws_platform_access_key_id}")
      }

      env {
        name  = "AWS_SECRET_ACCESS_KEY"
        value = sensitive("${var.aws_platform_secret_access_key}")
      }

      env {
        name  = "AWS_REGION"
        value = var.aws_region
      }

      env {
        name  = "AWS_EC2_METADATA_DISABLED"
        value = "true"
      }

      env {
        name  = "TF_PLUGIN_CACHE_DIR"
        value = "/root/.terraform.d/plugin-cache"
      }

      env {
        name  = "CLOUDFLARE_API_TOKEN"
        value = sensitive("${var.cloudflare_api_token}")
      }

      env {
        name  = "CLOUDFLARE_ACCOUNT_ID"
        value = sensitive("${var.cloudflare_account_id}")
      }

      env {
        name  = "CLOUDFLARE_ZONE_ID"
        value = sensitive("${var.cloudflare_zone_id}")
      }

      env {
        name  = "CLOUDFLARE_TUNNEL_BASE_DOMAIN"
        value = var.cloudflare_tunnel_base_domain
      }
    }
  }

  registry {
    server               = azurerm_container_registry.this.login_server
    username             = azurerm_container_registry.this.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.this.admin_password
  }

  tags = merge(var.tags, { Name = "${var.project_name}-worker" })
}

# API Container App
resource "azurerm_container_app" "api" {
  name                         = "${var.project_name}-${var.environment}-api"
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  ingress {
    external_enabled = true
    target_port      = 3001
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.this.login_server}/api:v60"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }

      env {
        name  = "WORKER_SERVICE_URL"
        value = "http://devops-lab-prod-worker:v11"
      }

      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }

      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name  = "LOG_LEVEL"
        value = "debug"
      }

      env {
        name  = "CORS_ORIGIN"
        value = "http://localhost:3000"
      }

      env {
        name  = "DURABLE_OBJECT_URL"
        value = var.durable_object_url
      }

      env {
        name  = "AWS_REGION"
        value = var.aws_region
      }

      env {
        name  = "AWS_PLATFORM_ACCOUNT_ID"
        value = var.platform_account_id
      }

      env {
        name  = "AWS_PLATFORM_ACCESS_KEY_ID"
        value = sensitive("${var.aws_platform_access_key_id}")
      }

      env {
        name  = "AWS_PLATFORM_SECRET_ACCESS_KEY"
        value = sensitive("${var.aws_platform_secret_access_key}")
      }

      env {
        name  = "CLOUDFLARE_API_TOKEN"
        value = sensitive("${var.cloudflare_api_token}")
      }

      env {
        name  = "CLOUDFLARE_ACCOUNT_ID"
        value = sensitive("${var.cloudflare_account_id}")
      }

      env {
        name  = "CLOUDFLARE_ZONE_ID"
        value = sensitive("${var.cloudflare_zone_id}")
      }

      env {
        name  = "CLOUDFLARE_TUNNEL_BASE_DOMAIN"
        value = var.cloudflare_tunnel_base_domain
      }
    }
  }

  registry {
    server               = azurerm_container_registry.this.login_server
    username             = azurerm_container_registry.this.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.this.admin_password
  }

  tags = merge(var.tags, { Name = "${var.project_name}-api" })
}

output "api_app_id" {
  description = "API Container App ID"
  value       = azurerm_container_app.api.id
}

output "api_app_url" {
  description = "API Container App FQDN"
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "container_registry_login_server" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.this.login_server
}

output "container_registry_admin_username" {
  description = "Container Registry admin username"
  value       = azurerm_container_registry.this.admin_username
  sensitive   = true
}

output "container_registry_admin_password" {
  description = "Container Registry admin password"
  value       = azurerm_container_registry.this.admin_password
  sensitive   = true
}

output "worker_app_id" {
  description = "Worker Container App ID"
  value       = azurerm_container_app.worker.id
}


