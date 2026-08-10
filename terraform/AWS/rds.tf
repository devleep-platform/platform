resource "random_password" "db_password_v2" {
    length           = 24
    special          = false
}

resource "aws_secretsmanager_secret" "db_credentials" {
    name = "devleep/prod/db_password_v2"
}

resource "aws_secretsmanager_secret_version" "db_credentials_version" {
    secret_id     = aws_secretsmanager_secret.db_credentials.id
    secret_string = random_password.db_password_v2.result
}


resource "aws_db_subnet_group" "rds" {
    name       = "devleep-db-subnet-group"
    subnet_ids = aws_subnet.private[*].id

    tags = {
        Name = "devleep-db-subnet-group"
    }
}

resource "aws_security_group" "rds" {
    name        = "devleep-rds-sg"
    description = "Security group for RDS instance"
    vpc_id      = aws_vpc.main.id

    ingress {
        from_port   = 5432
        to_port     = 5432
        protocol    = "tcp"
        cidr_blocks = [aws_subnet.private[0].cidr_block, aws_subnet.private[1].cidr_block]
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
}

resource "aws_db_instance" "rds" {
    identifier              = "devleep-prod-db"
    allocated_storage       = 20
    engine                  = "postgres"
    engine_version          = "16"
    instance_class          = "db.t4g.micro"
    db_name                 = var.db_name
    username                = var.db_username
    password                = random_password.db_password_v2.result
    db_subnet_group_name    = aws_db_subnet_group.rds.name
    vpc_security_group_ids  = [aws_security_group.rds.id]
    skip_final_snapshot     = true
    publicly_accessible     = false

    tags = {
        Name = "devleep-rds-instance"
    }
}