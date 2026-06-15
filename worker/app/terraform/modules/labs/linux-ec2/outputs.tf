output "nodes" {
  description = "Provisioned nodes information"
  value = [
    for instance in aws_instance.node : {
      instance_id = instance.id
      private_ip  = instance.private_ip
      public_ip   = instance.public_ip
      ami_id      = instance.ami
      instance_type = instance.instance_type
    }
  ]
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
