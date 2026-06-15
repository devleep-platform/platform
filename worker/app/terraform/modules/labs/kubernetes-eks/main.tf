terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC for EKS cluster
resource "aws_vpc" "lab" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name           = "lab-eks-vpc-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}

# Subnet for EKS control plane and nodes
resource "aws_subnet" "lab" {
  vpc_id            = aws_vpc.lab.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name           = "lab-eks-subnet-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}

# IAM role for EKS cluster
resource "aws_iam_role" "eks_cluster" {
  name = "lab-eks-cluster-${var.session_id}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name           = "lab-eks-cluster-role-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}

# Attach required policies to EKS cluster role
resource "aws_iam_role_policy_attachment" "eks_cluster" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# Security group for EKS control plane
resource "aws_security_group" "eks" {
  name        = "lab-eks-sg-${var.session_id}"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.lab.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name           = "lab-eks-sg-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}

# Get available zones
data "aws_availability_zones" "available" {
  state = "available"
}

# EKS Cluster
resource "aws_eks_cluster" "lab" {
  name     = "lab-eks-${var.session_id}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = [aws_subnet.lab.id]
    security_groups         = [aws_security_group.eks.id]
    endpoint_private_access = true
    endpoint_public_access  = false  # Private only, access via CF Tunnel
  }

  tags = {
    Name           = "lab-eks-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}

# IAM role for EKS node group
resource "aws_iam_role" "eks_node" {
  name = "lab-eks-node-${var.session_id}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name           = "lab-eks-node-role-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}

# Attach node policies
resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}

# EKS Node Group - single t3.medium node
resource "aws_eks_node_group" "lab" {
  cluster_name    = aws_eks_cluster.lab.name
  node_group_name = "lab-nodes-${var.session_id}"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = [aws_subnet.lab.id]
  version         = var.kubernetes_version

  scaling_config {
    desired_size = var.desired_nodes
    max_size     = var.max_nodes
    min_size     = var.min_nodes
  }

  instance_types = [var.node_instance_type]

  tags = {
    Name           = "lab-eks-nodes-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy,
  ]
}

# CloudWatch log group for EKS cluster logs
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/lab/${var.session_id}"
  retention_in_days = 7

  tags = {
    Name           = "lab-eks-logs-${var.session_id}"
    "lab-session"  = var.session_id
    "managed-by"   = "devops-lab-platform"
  }
}
