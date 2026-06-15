terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Uncomment to use remote state in Azure Storage
  # backend "azurerm" {
  #   resource_group_name  = "devops-lab-tfstate-rg"
  #   storage_account_name = "devopslabstate"
  #   container_name       = "tfstate"
  #   key                  = "prod.tfstate"
  # }

  # For local development, state files are stored locally
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    virtual_machine {
      delete_os_disk_on_deletion            = true
      graceful_shutdown                     = false
      skip_shutdown_and_force_delete        = false
    }
  }
}

provider "random" {}
