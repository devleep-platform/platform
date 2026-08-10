# acm.tf

# 1. Request TLS Certificate for api.devleep.com
resource "aws_acm_certificate" "api" {
  domain_name       = "api.devleep.com"
  validation_method = "DNS"

  tags = {
    Name = "devleep-api-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}


# This resource forces Terraform to wait for the certificate to be validated
resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  # If you automated Route53 this would check the records, 
  # but since you use Cloudflare, this will just wait until you manually add the CNAME.
}

# 2. Add HTTPS Listener (Port 443) to ALB
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# 3. Redirect HTTP (Port 80) to HTTPS (Port 443)
resource "aws_lb_listener_rule" "http_redirect" {
  listener_arn = aws_lb_listener.api.arn
  priority     = 100

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    path_pattern {
      values = ["*"]
    }
  }
}