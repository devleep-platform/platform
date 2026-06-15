output "resource_group_name" {
  description = "Name of the Azure Resource Group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the Azure Resource Group"
  value       = azurerm_resource_group.main.id
}

output "app_service_name" {
  description = "Name of the App Service"
  value       = azurerm_linux_web_app.main.name
}

output "app_service_url" {
  description = "URL of the deployed App Service"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_service_id" {
  description = "ID of the App Service"
  value       = azurerm_linux_web_app.main.id
}

output "app_service_principal_id" {
  description = "Principal ID of App Service managed identity"
  value       = azurerm_linux_web_app.main.identity[0].principal_id
}

output "application_insights_key" {
  description = "Application Insights instrumentation key"
  value       = var.enable_monitoring ? azurerm_application_insights.main[0].instrumentation_key : null
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = var.enable_monitoring ? azurerm_application_insights.main[0].connection_string : null
  sensitive   = true
}

output "deploy_instructions" {
  description = "Instructions for deploying the backend application"
  value = <<-EOT
    
    ✅ Azure Infrastructure Ready!
    
    Backend API URL: https://${azurerm_linux_web_app.main.default_hostname}
    
    Next Steps:
    1. Deploy backend code:
       cd backend
       npm run build
       zip -r ../deploy.zip . -x "node_modules/*" ".git/*"
       az webapp deployment source config-zip \
         --resource-group ${azurerm_resource_group.main.name} \
         --name ${azurerm_linux_web_app.main.name} \
         --src-path ../deploy.zip
    
    2. Update Frontend:
       - Update .env.local with:
         NEXT_PUBLIC_API_URL=https://${azurerm_linux_web_app.main.default_hostname}
       - Deploy to Cloudflare Pages
    
    3. Verify Backend:
       curl https://${azurerm_linux_web_app.main.default_hostname}/auth/me
       (should return 401 - no token)
    
    4. Test Auth Flow:
       - Register: POST /auth/register
       - Login: POST /auth/login
       - Dashboard: Check token persists across reloads
  EOT
}

# Container Apps Outputs

output "worker_internal_fqdn" {
  description = "Worker Container App Internal FQDN (for internal VNet routing)"
  value       = azurerm_container_app.worker.ingress[0].fqdn
}


output "api_app_fqdn" {
  description = "API Container App public FQDN"
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "container_registry_url" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.this.login_server
}
