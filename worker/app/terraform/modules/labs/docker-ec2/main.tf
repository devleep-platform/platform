terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

resource "tls_private_key" "lab_ssh" {
  algorithm = "ED25519"
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {}

data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_vpc" "lab" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment_name}-${var.session_id}"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}

resource "aws_internet_gateway" "lab" {
  vpc_id = aws_vpc.lab.id

  tags = {
    Name        = "${var.environment_name}-igw"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}

# Public subnet — EC2 gets public IP for outbound internet (Docker pulls)
# Inbound blocked by security group; access is via Cloudflare Tunnel only
resource "aws_subnet" "lab" {
  vpc_id                  = aws_vpc.lab.id
  cidr_block              = var.subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.environment_name}-subnet"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}

resource "aws_route_table" "lab" {
  vpc_id = aws_vpc.lab.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.lab.id
  }

  tags = {
    Name        = "${var.environment_name}-rt"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}

resource "aws_route_table_association" "lab" {
  subnet_id      = aws_subnet.lab.id
  route_table_id = aws_route_table.lab.id
}

resource "aws_security_group" "lab" {
  name        = "${var.environment_name}-${var.session_id}"
  description = "Security group for Docker lab — access via Cloudflare Tunnel only"
  vpc_id      = aws_vpc.lab.id

  # No inbound rules — all access via Cloudflare Tunnel

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment_name}-sg"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}

resource "aws_instance" "lab" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.lab.id
  vpc_security_group_ids = [aws_security_group.lab.id]

  associate_public_ip_address = true

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cf_tunnel_token = var.cf_tunnel_token
    session_token   = var.session_token
    ssh_public_key  = tls_private_key.lab_ssh.public_key_openssh
  }))

  tags = {
    Name        = "${var.environment_name}-docker-${var.session_id}"
    lab-session = var.session_id
    managed-by  = "devops-lab-platform"
  }
}
