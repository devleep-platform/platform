packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1"
    }
  }
}

variable "region" {
  default = "ap-south-1"
}

source "amazon-ebs" "golden" {
  ami_name      = "devleep-lab-golden-${formatdate("YYYYMMDD-HHmm", timestamp())}"
  instance_type = "t3.micro"
  region        = var.region

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"] # Canonical
  }

  ssh_username = "ubuntu"
  ami_groups   = ["all"]

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name    = "devleep-lab-golden"
    Project = "devleep"
  }
}

build {
  sources = ["source.amazon-ebs.golden"]

  provisioner "shell" {
    environment_vars = ["DEBIAN_FRONTEND=noninteractive"]
    script           = "${path.root}/provision.sh"
    # Give the provision script up to 30 minutes (Docker image pulls take time)
    timeout = "30m"
  }
}
