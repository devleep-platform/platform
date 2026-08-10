output "aws_dns_name" {
  value       = aws_lb.main.dns_name
  sensitive   = true
}
