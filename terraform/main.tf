# Data source to get current subscription context
data "azurerm_client_config" "current" {}

# Generate random suffix for unique naming
resource "random_string" "resource_suffix" {
  length  = 4
  special = false
  lower   = true
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = merge(
    var.tags,
    {
      "Environment" = var.environment
      "CreatedAt"   = timestamp()
    }
  )
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.project_name}-${var.environment}-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.app_service_sku

  tags = var.tags
}

# Application Insights for monitoring
resource "azurerm_application_insights" "main" {
  count = var.enable_monitoring ? 1 : 0

  name                = "${var.project_name}-${var.environment}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  retention_in_days   = var.log_retention_days

  tags = var.tags

  lifecycle {
    ignore_changes = [workspace_id]
  }
}

# App Service (Web App) - Backend API
resource "azurerm_linux_web_app" "main" {
  name                = "${var.project_name}-${var.environment}-api-${random_string.resource_suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  https_only = true

  app_settings = merge(
    var.app_settings,
    {
      # Database connection (using Neon)
      "DATABASE_URL" = var.database_url
      
      # Application settings
      "JWT_SECRET" = var.jwt_secret
      "JWT_EXPIRY" = "24h"
      "NODE_ENV" = var.environment == "prod" ? "production" : "development"
      "PORT" = "8080"
      
      # AWS configuration
      "AWS_REGION" = var.aws_region
      "AWS_ACCOUNT_ID" = var.aws_account_id
      "AWS_PLATFORM_ACCOUNT_ID" = var.platform_account_id
      "AWS_PLATFORM_ACCESS_KEY_ID" = var.aws_platform_access_key_id
      "AWS_PLATFORM_SECRET_ACCESS_KEY" = var.aws_platform_secret_access_key
      
      # CORS configuration
      "CORS_ORIGIN" = "https://devops-lab.pages.dev,http://localhost:3000"
      
      # Monitoring
      "APPINSIGHTS_INSTRUMENTATIONKEY" = var.enable_monitoring ? azurerm_application_insights.main[0].instrumentation_key : ""
      "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.enable_monitoring ? azurerm_application_insights.main[0].connection_string : ""
      "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    }
  )

  site_config {
    application_stack {
      node_version = "18-lts"
    }

    # Security headers
    http2_enabled                     = true
    minimum_tls_version               = "1.2"
    scm_minimum_tls_version           = "1.2"
    websockets_enabled                = true
    managed_pipeline_mode             = "Integrated"

    # Performance
    always_on                         = true
    app_command_line                  = "node dist/index.js"
  }

  identity {
    type = "SystemAssigned"
  }

  sticky_settings {
    app_setting_names = ["APPINSIGHTS_INSTRUMENTATIONKEY"]
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_SWAP_WARMUP_WAIT_TIME"]
    ]
  }
}
