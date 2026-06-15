output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.lab.id
}

output "private_ip" {
  description = "Private IP address of the Docker instance"
  value       = aws_instance.lab.private_ip
}

output "public_ip" {
  description = "Public IP address of the Docker instance"
  value       = aws_instance.lab.public_ip
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.lab.id
}

output "subnet_id" {
  description = "Subnet ID"
  value       = aws_subnet.lab.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.lab.id
}

output "session_id" {
  description = "Session ID"
  value       = var.session_id
}

output "terminal_token" {
  description = "Terminal authentication token for ttyd"
  value       = var.session_token
  sensitive   = true
}

output "ssh_private_key" {
  description = "Ephemeral ED25519 private key for worker SSH access via Cloudflare Tunnel"
  value       = tls_private_key.lab_ssh.private_key_openssh
  sensitive   = true
}
