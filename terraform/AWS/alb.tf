resource "aws_security_group" "alb" {
    name        = "devleep-alb-sg"
    description = "Security group for the ALB, allowing inbound HTTP traffic from the internet"
    vpc_id      = aws_vpc.main.id

    ingress {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
}


resource "aws_lb" "main" {
    name               = "devleep-alb"
    internal           = false
    load_balancer_type = "application"
    security_groups    = [aws_security_group.alb.id]
    subnets            = aws_subnet.public[*].id

    tags = {
        Name = "devleep-alb"
    }
}

resource "aws_lb_target_group" "api" {
    name     = "devleep-api-target-group"
    port     = 8080
    protocol = "HTTP"
    vpc_id   = aws_vpc.main.id
    target_type = "ip"

    health_check {
        path                = "/health"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 5
        unhealthy_threshold = 2
        matcher             = "200"
    }

    tags = {
        Name = "devleep-api-target-group"
    }
}

resource "aws_lb_listener" "api" {
    load_balancer_arn = aws_lb.main.arn
    port              = 80
    protocol          = "HTTP"

    default_action {
        type             = "forward"
        target_group_arn = aws_lb_target_group.api.arn
    }
}