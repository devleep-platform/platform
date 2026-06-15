# Terraform Azure Infrastructure as Code Guide

## Prerequisites

1. **Terraform installed** (>= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Windows
   choco install terraform
   
   # Or download from https://www.terraform.io/downloads.html
   ```

2. **Azure CLI installed**
   ```bash
   choco install azure-cli
   ```

3. **Authentication**
   ```bash
   az login
   az account set --subscription "YOUR_SUBSCRIPTION_ID"
   ```

## Project Structure

```
terraform/
├── provider.tf              # Azure provider configuration
├── main.tf                  # Main resource definitions
├── variables.tf             # Variable declarations
├── outputs.tf               # Output values
├── locals.tf                # Local variables
├── backend.tf               # Backend configuration
├── terraform.tfvars         # Production variables (git-ignored)
├── terraform.tfvars.dev     # Development variables
├── terraform.tfvars.staging # Staging variables
├── terraform.tfvars.prod    # Production variables
└── README.md                # This file
```

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform

# Local state (development)
terraform init

# Or with remote backend (production)
terraform init \
  -backend-config="resource_group_name=devops-lab-tfstate-rg" \
  -backend-config="storage_account_name=devopslabstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.tfstate"
```

### 2. Update Variables

Edit `terraform.tfvars` with your values:

```hcl
azure_subscription_id       = "YOUR_SUBSCRIPTION_ID"
postgres_admin_password     = "SecurePassword@123456"
jwt_secret                  = "super-secret-jwt-key-32-chars-minimum!!"
```

**⚠️ Important:** Never commit secrets to git!

### 3. Plan Infrastructure

```bash
# Development
terraform plan -var-file="terraform.tfvars.dev" -out=tfplan.dev

# Staging
terraform plan -var-file="terraform.tfvars.staging" -out=tfplan.staging

# Production
terraform plan -var-file="terraform.tfvars.prod" -out=tfplan.prod
```

### 4. Apply Configuration

```bash
# Development
terraform apply tfplan.dev

# Staging
terraform apply tfplan.staging

# Production (with approval)
terraform apply tfplan.prod
```

### 5. Get Outputs

```bash
# Show all outputs
terraform output

# Get specific values
terraform output app_service_url
terraform output -raw postgres_database_url
terraform output -json
```

## Environment-Specific Deployments

### Development Environment

```bash
terraform plan \
  -var-file="terraform.tfvars.dev" \
  -out=dev.tfplan

terraform apply dev.tfplan
```

### Staging Environment

```bash
terraform plan \
  -var-file="terraform.tfvars.staging" \
  -out=staging.tfplan

terraform apply staging.tfplan
```

### Production Environment

```bash
terraform plan \
  -var-file="terraform.tfvars.prod" \
  -out=prod.tfplan

terraform apply prod.tfplan
```

## Managing State

### Local State (Development)

State stored in `terraform.tfstate` (git-ignored). Fine for dev.

```bash
# Backup
cp terraform.tfstate terraform.tfstate.backup

# View state
terraform state list
terraform state show azurerm_linux_web_app.main
```

### Remote State (Production)

Store state in Azure Storage for team collaboration:

```bash
# Create storage account for state
az group create --name devops-lab-tfstate-rg --location eastus

az storage account create \
  --resource-group devops-lab-tfstate-rg \
  --name devopslabstate \
  --sku Standard_LRS

az storage container create \
  --account-name devopslabstate \
  --name tfstate

# Get storage key
az storage account keys list \
  --account-name devopslabstate \
  --query '[0].value' -o tsv

# Migrate to remote backend
terraform init -migrate-state \
  -backend-config="resource_group_name=devops-lab-tfstate-rg" \
  -backend-config="storage_account_name=devopslabstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.tfstate" \
  -backend-config="access_key=<STORAGE_KEY>"
```

## Key Resources Created

### Resource Group
- Organizes all resources
- Tags for organization

### App Service Plan
- **Dev/Staging:** B1 ($12/month)
- **Production:** S1 ($69/month)

### App Service (Linux Web App)
- Node.js 18 LTS runtime
- System-assigned managed identity
- HTTPS enforced
- Application Insights integration

### PostgreSQL Flexible Server
- **Dev/Staging:** Burstable B1ms ($20/month)
- **Production:** Standard D2s_v3 ($200+/month)
- Automated backups (7-90 days)
- Firewall rules configured

### Application Insights
- Performance monitoring
- Custom metrics
- Alerts and diagnostics

## Useful Commands

```bash
# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Show plan in detail
terraform plan -var-file="terraform.tfvars.dev" -detailed-exitcode

# Destroy all resources
terraform destroy -var-file="terraform.tfvars.dev"

# Target specific resource
terraform apply -target=azurerm_linux_web_app.main

# Refresh state
terraform refresh

# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/SUB_ID/resourceGroups/rg-name
```

## Secrets Management

### Option 1: Environment Variables

```bash
export TF_VAR_jwt_secret="your-secret-key"
export TF_VAR_postgres_admin_password="your-password"
terraform apply
```

### Option 2: .env File (Local Only)

Create `.env.local` (git-ignored):
```
TF_VAR_jwt_secret=your-secret-key
TF_VAR_postgres_admin_password=your-password
```

Source it:
```bash
source .env.local
terraform apply
```

### Option 3: Azure Key Vault (Recommended for Production)

```bash
# Create Key Vault
az keyvault create --resource-group devops-lab-rg --name devops-lab-kv

# Store secrets
az keyvault secret set --vault-name devops-lab-kv --name jwt-secret --value "your-secret"
az keyvault secret set --vault-name devops-lab-kv --name db-password --value "your-password"

# Retrieve in Terraform
data "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  key_vault_id = azurerm_key_vault.main.id
}
```

## Troubleshooting

### Authentication Error

```bash
# Check current subscription
az account show

# List available subscriptions
az account list

# Set subscription
az account set --subscription "SUBSCRIPTION_ID"
```

### State Lock Issues

```bash
# View locks
terraform state list
terraform state rm azurerm_resource_group.main  # Force remove

# Unlock (if stuck)
# Note: This is dangerous! Use only if lock is truly stuck
terraform force-unlock <LOCK_ID>
```

### Resource Already Exists

```bash
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/...

# Or remove from state and re-create
terraform state rm azurerm_linux_web_app.main
```

### Terraform Drift

```bash
# Detect drift
terraform plan

# Refresh state from Azure
terraform refresh

# Fix drift
terraform apply
```

## Cost Estimation

Run cost estimation:

```bash
# Install Infracost
brew install infracost

# Generate cost estimate
infracost breakdown --path terraform/

# Monthly cost summary
infracost breakdown --path terraform/ --format table
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Terraform

on:
  push:
    branches: [main]
    paths: [terraform/**]
  pull_request:
    branches: [main]
    paths: [terraform/**]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Init
        run: terraform -chdir=terraform init
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
      
      - name: Terraform Plan
        run: |
          terraform -chdir=terraform plan \
            -var-file="terraform.tfvars.prod" \
            -out=tfplan
      
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform -chdir=terraform apply -auto-approve tfplan
```

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` for `terraform.tfvars`
   - Use Azure Key Vault for production

2. **Use Remote State**
   - Store state in Azure Storage
   - Enable versioning
   - Use encryption

3. **Implement RBAC**
   - Limit who can apply changes
   - Use managed identities

4. **Audit Changes**
   - Use `terraform plan` in PRs
   - Review all changes before apply
   - Keep audit logs

5. **Backup State**
   - Regular backups of state files
   - Version control for IaC

## Useful Resources

- [Terraform Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Best Practices](https://learn.microsoft.com/en-us/azure/architecture/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices)

## Support

For issues, check:
1. `terraform validate` - syntax errors
2. `terraform plan` - resource issues
3. Azure Portal - actual resource state
4. Terraform logs - `TF_LOG=DEBUG terraform apply`
