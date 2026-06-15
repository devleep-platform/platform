output "vpc_id" {
  value = aws_vpc.lab.id
}

output "subnet_id" {
  value = aws_subnet.lab.id
}

output "node_private_ips" {
  value = {
    for idx, instance in aws_instance.node :
    var.nodes[idx].name => instance.private_ip
  }
}

output "node_instance_ids" {
  value = {
    for idx, instance in aws_instance.node :
    var.nodes[idx].name => instance.id
  }
}
