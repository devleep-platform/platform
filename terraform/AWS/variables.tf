variable "aws_region" {
    type        = string
    default     = "ap-south-1"
    description = "The AWS region where resources will be created."
}

variable "vpc_cidr" {
    type        = string
    default     = "10.0.0.0/16"
    description = "The CIDR block for the VPC."
}

variable "db_name" {
    type        = string
    default     = "devleep_db"
    description = "The name of the database."
}

variable "db_username" {
    type        = string
    default     = "devleep_admin"
    description = "The username for the database."
}