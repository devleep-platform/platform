

terraform {
  backend "s3" {
    bucket         = "devleep-terraform-statep-prod"
    key            = "platform/prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "devleep-terraform-locks"
    encrypt        = true
  }
}


