resource "aws_ecs_cluster" "main" {
    name = "devleep-ecs-cluster"
}

resource "aws_cloudwatch_log_group" "ecs-logs" {
    name = "/ecs/devleep"
    retention_in_days = 7
}

resource "aws_iam_role" "ecs_task_execution_role" {
    name = "devleep-ecs-task-execution-role"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Action = "sts:AssumeRole"
                Effect = "Allow"
                Principal = {
                    Service = "ecs-tasks.amazonaws.com"
                }
            },
        ]
    })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
    role       = aws_iam_role.ecs_task_execution_role.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_security_group" "ecs_tasks" {
    name        = "devleep-ecs-tasks-sg"
    description = "Allow inbound access from ALB and all outbound traffic"
    vpc_id      = aws_vpc.main.id

    ingress {
        from_port   = 8080
        to_port     = 8080
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
}

# ---------------------------------------------------------
# ECS Task Definition & Service: API
# ---------------------------------------------------------

resource "aws_ecs_task_definition" "api" {
    family                   = "devleep-api-task"
    network_mode             = "awsvpc"
    requires_compatibilities = ["FARGATE"]
    cpu                      = "256"
    memory                   = "512"

    execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

    container_definitions = jsonencode([
        {
            name      = "api"
            image     = "${aws_ecr_repository.api.repository_url}:latest"
            essential = true
            portMappings = [
                {
                    containerPort = 8080
                    hostPort      = 8080
                    protocol      = "tcp"
                }
            ]

    environment = [
      { name = "PORT", value = "3001" },
      { name = "LOG_LEVEL", value = "info" }
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:DATABASE_URL::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:JWT_SECRET::" },
      { name = "DURABLE_OBJECT_URL", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:DURABLE_OBJECT_URL::" },
      { name = "CLOUDFLARE_API_TOKEN", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:CLOUDFLARE_API_TOKEN::" },
      { name = "CLOUDFLARE_ACCOUNT_ID", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:CLOUDFLARE_ACCOUNT_ID::" },
      { name = "CLOUDFLARE_ZONE_ID", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:CLOUDFLARE_ZONE_ID::" },
      { name = "CLOUDFLARE_TUNNEL_BASE_DOMAIN", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:CLOUDFLARE_TUNNEL_BASE_DOMAIN::" },
      { name = "CORS_ORIGIN", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:CORS_ORIGIN::" }
      { name = "AWS_ACCESS_KEY_ID", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:AWS_ACCESS_KEY_ID::" }
      { name = "AWS_SECRET_ACCESS_KEY", valueFrom = "${aws_secretsmanager_secret.platform_secrets-v2.arn}:AWS_SECRET_ACCESS_KEY::" }
    ]


            logConfiguration = {
                logDriver = "awslogs"
                options   = {
                    awslogs-group         = aws_cloudwatch_log_group.ecs-logs.name
                    awslogs-region        = var.aws_region
                    awslogs-stream-prefix = "api"
                }
            }
        }
    ])
}

resource "aws_ecs_service" "api" {
    name            = "devleep-api-service"
    cluster         = aws_ecs_cluster.main.id
    task_definition = aws_ecs_task_definition.api.arn
    desired_count   = 1
    launch_type     = "FARGATE"

    network_configuration {
        subnets          = aws_subnet.private[*].id
        security_groups  = [aws_security_group.ecs_tasks.id]
        assign_public_ip = false
    }

    load_balancer {
        target_group_arn = aws_lb_target_group.api.arn
        container_name   = "api"
        container_port   = 8080
    }

    depends_on = [aws_lb_listener.api]
}

# ---------------------------------------------------------
# ECS Task Definition & Service: WORKER
# ---------------------------------------------------------

resource "aws_ecs_task_definition" "worker" {
    family                   = "devleep-worker-task"
    network_mode             = "awsvpc"
    requires_compatibilities = ["FARGATE"]
    cpu                      = "256"
    memory                   = "512"

    execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

    container_definitions = jsonencode([
        {
            name      = "worker"
            image     = "${aws_ecr_repository.worker.repository_url}:latest"
            essential = true
            logConfiguration = {
                logDriver = "awslogs"
                options   = {
                    awslogs-group         = aws_cloudwatch_log_group.ecs-logs.name
                    awslogs-region        = var.aws_region
                    awslogs-stream-prefix = "worker"
                }
            }
        }
    ])
}

resource "aws_ecs_service" "worker" {
    name            = "devleep-worker-service"
    cluster         = aws_ecs_cluster.main.id
    task_definition = aws_ecs_task_definition.worker.arn
    desired_count   = 1
    launch_type     = "FARGATE"

    network_configuration {
        subnets          = aws_subnet.private[*].id
        security_groups  = [aws_security_group.ecs_tasks.id]
        assign_public_ip = false
    }
}