output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.lab.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint (private)"
  value       = aws_eks_cluster.lab.endpoint
}

output "cluster_version" {
  description = "Kubernetes version"
  value       = aws_eks_cluster.lab.version
}

output "node_group_id" {
  description = "EKS node group ID"
  value       = aws_eks_node_group.lab.id
}

output "cluster_security_group_id" {
  description = "Security group ID for the cluster"
  value       = aws_security_group.eks.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.lab.id
}

output "subnet_id" {
  description = "Subnet ID"
  value       = aws_subnet.lab.id
}

output "session_id" {
  description = "Lab session ID"
  value       = var.session_id
}
