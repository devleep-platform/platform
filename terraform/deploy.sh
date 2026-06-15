#!/bin/bash
# Terraform deployment helper script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 DevOps Lab Platform - Terraform Deployment${NC}"
echo "================================================"

# Functions
show_menu() {
    echo -e "\n${YELLOW}Select environment:${NC}"
    echo "1) Development"
    echo "2) Staging"
    echo "3) Production"
    echo "4) Exit"
    echo ""
    read -p "Enter choice [1-4]: " choice
}

get_env_file() {
    case $1 in
        1) echo "terraform.tfvars.dev" ;;
        2) echo "terraform.tfvars.staging" ;;
        3) echo "terraform.tfvars.prod" ;;
        *) echo "" ;;
    esac
}

get_env_name() {
    case $1 in
        1) echo "Development" ;;
        2) echo "Staging" ;;
        3) echo "Production" ;;
        *) echo "" ;;
    esac
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform not installed${NC}"
    exit 1
fi

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not installed${NC}"
    exit 1
fi

# Verify Azure authentication
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Authenticating with Azure...${NC}"
    az login
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Change to terraform directory
cd "$(dirname "$0")"

# Initialize Terraform
if [ ! -d ".terraform" ]; then
    echo -e "\n${YELLOW}Initializing Terraform...${NC}"
    terraform init
fi

# Main loop
while true; do
    show_menu
    
    if [ "$choice" == "4" ]; then
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
    fi
    
    ENV_FILE=$(get_env_file $choice)
    ENV_NAME=$(get_env_name $choice)
    
    if [ -z "$ENV_FILE" ]; then
        echo -e "${RED}Invalid choice${NC}"
        continue
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Environment file not found: $ENV_FILE${NC}"
        continue
    fi
    
    echo -e "\n${YELLOW}Selected: $ENV_NAME${NC}"
    echo ""
    read -p "What would you like to do? [plan/apply/destroy/refresh]: " action
    
    case $action in
        plan)
            echo -e "\n${YELLOW}Running Terraform plan for $ENV_NAME...${NC}"
            terraform plan -var-file="$ENV_FILE" -out="${ENV_NAME}.tfplan"
            echo -e "${GREEN}✓ Plan saved to ${ENV_NAME}.tfplan${NC}"
            ;;
        apply)
            echo -e "\n${YELLOW}Applying Terraform configuration for $ENV_NAME...${NC}"
            if [ -f "${ENV_NAME}.tfplan" ]; then
                terraform apply "${ENV_NAME}.tfplan"
            else
                terraform apply -var-file="$ENV_FILE" -auto-approve
            fi
            echo -e "\n${GREEN}✓ Apply complete!${NC}"
            echo -e "${YELLOW}Outputs:${NC}"
            terraform output -var-file="$ENV_FILE"
            ;;
        destroy)
            echo -e "\n${RED}⚠️  WARNING: This will destroy all resources in $ENV_NAME${NC}"
            read -p "Type 'yes' to confirm: " confirm
            if [ "$confirm" == "yes" ]; then
                terraform destroy -var-file="$ENV_FILE"
            else
                echo -e "${YELLOW}Cancelled${NC}"
            fi
            ;;
        refresh)
            echo -e "\n${YELLOW}Refreshing state...${NC}"
            terraform refresh -var-file="$ENV_FILE"
            echo -e "${GREEN}✓ State refreshed${NC}"
            ;;
        *)
            echo -e "${RED}Unknown action: $action${NC}"
            ;;
    esac
done
