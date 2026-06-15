# Terraform Quick Reference

## One-Line Deployment Commands

### Development Environment
```bash
cd terraform
terraform init
terraform plan -var-file="terraform.tfvars.dev" -out=dev.tfplan
terraform apply dev.tfplan
```

### Staging Environment
```bash
cd terraform
terraform init
terraform plan -var-file="terraform.tfvars.staging" -out=staging.tfplan
terraform apply staging.tfplan
```

### Production Environment
```bash
cd terraform
terraform init
terraform plan -var-file="terraform.tfvars.prod" -out=prod.tfplan
terraform apply prod.tfplan
```

## Using Helper Scripts

### Linux/macOS
```bash
chmod +x terraform/deploy.sh
terraform/deploy.sh
# Follow interactive menu
```

### Windows
```powershell
cd terraform
.\deploy.bat
# Follow interactive menu
```

## Get Output Values After Deployment

```bash
cd terraform

# Get app URL
terraform output app_service_url

# Get database connection string (sensitive output)
terraform output -raw postgres_database_url

# Get all outputs
terraform output

# Get specific output as JSON
terraform output -json app_service_name
```

## Update Backend After Deployment

After Terraform creates the infrastructure:

1. **Get the database connection string:**
   ```bash
   cd terraform
   terraform output -raw postgres_database_url
   ```

2. **Update backend `.env`:**
   ```bash
   cd backend
   # Copy the DATABASE_URL from step 1
   # Edit .env and add:
   # DATABASE_URL=postgresql://...
   # JWT_SECRET=your-secret-key
   # NODE_ENV=production
   ```

3. **Deploy backend:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

## Destroy Infrastructure (Cleanup)

**⚠️ WARNING: This deletes all resources!**

```bash
cd terraform

# Delete development
terraform destroy -var-file="terraform.tfvars.dev"

# Delete staging
terraform destroy -var-file="terraform.tfvars.staging"

# Delete production
terraform destroy -var-file="terraform.tfvars.prod"
```

## Troubleshooting

### Issue: "Provider version constraints not satisfied"
```bash
terraform version
terraform init -upgrade
```

### Issue: "Resource already exists"
```bash
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/SUB_ID/resourceGroups/rg-name

# Or remove and recreate
terraform state rm azurerm_linux_web_app.main
terraform apply
```

### Issue: "Unable to authenticate"
```bash
az login
az account show  # Verify subscription
```

### Issue: "State locked"
```bash
# Check locks
terraform state list

# Force unlock (dangerous!)
terraform force-unlock LOCK_ID
```

## Viewing Infrastructure State

```bash
# Show all resources in state
terraform state list

# Show specific resource details
terraform state show azurerm_linux_web_app.main

# View state file (raw JSON)
cat terraform.tfstate

# Backup state
cp terraform.tfstate terraform.tfstate.backup
```

## Modifying Infrastructure

### Scale Up App Service (Example)

Edit `terraform.tfvars`:
```hcl
app_service_sku = "S1"  # Changed from B1
```

Then apply:
```bash
terraform plan -var-file="terraform.tfvars"
terraform apply
```

### Increase Database Storage

Edit `terraform.tfvars`:
```hcl
postgres_storage_mb = 65536  # Changed from 32768 (64 GB)
```

Then apply:
```bash
terraform plan -var-file="terraform.tfvars"
terraform apply
```

## Advanced: Remote State Management

### Option 1: Azure Storage Backend

```bash
# Create resource group
az group create --name tf-state-rg --location eastus

# Create storage account
az storage account create \
  --resource-group tf-state-rg \
  --name tfstate12345 \
  --sku Standard_LRS

# Create container
az storage container create \
  --account-name tfstate12345 \
  --name tfstate

# Get storage key
az storage account keys list \
  --account-name tfstate12345 \
  --query [0].value -o tsv
```

### Option 2: Terraform Cloud Backend

```hcl
# In provider.tf
terraform {
  cloud {
    organization = "your-org"
    
    workspaces {
      name = "devops-lab"
    }
  }
}
```

## Useful Terraform Commands

```bash
# Format all TF files
terraform fmt -recursive

# Validate syntax
terraform validate

# Show detailed plan
terraform plan -var-file="terraform.tfvars.dev" -detailed-exitcode

# Show specific resource
terraform show azurerm_linux_web_app.main

# Refresh state from Azure
terraform refresh -var-file="terraform.tfvars.dev"

# Target specific resource
terraform apply -target=azurerm_postgresql_flexible_server.main

# Debug mode (verbose logging)
export TF_LOG=DEBUG
terraform plan
unset TF_LOG
```

## Security Checklist

- [ ] Never commit `terraform.tfvars` with real secrets
- [ ] Use `.gitignore` for state files
- [ ] Rotate `jwt_secret` regularly
- [ ] Enable Azure backup for PostgreSQL
- [ ] Use managed identities (already configured)
- [ ] Enable HTTPS only (already configured)
- [ ] Set up monitoring alerts
- [ ] Review resource group access (RBAC)
- [ ] Enable audit logging in Azure
- [ ] Backup state files regularly

## Cost Management

```bash
# Install Infracost
brew install infracost

# Get cost breakdown
infracost breakdown --path terraform/

# Compare costs between environments
infracost diff --path terraform/terraform.tfvars.dev terraform/terraform.tfvars.prod
```

## Next Steps

1. ✅ Run Terraform to create infrastructure
2. Deploy backend API
3. Deploy frontend to Cloudflare Pages
4. Configure monitoring
5. Set up CI/CD pipeline
6. Scale based on usage

## Support

- [Terraform Docs](https://www.terraform.io/docs)
- [Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Terraform Community](https://discuss.hashicorp.com/c/terraform)
