resource "aws_ecr_repository" "api" {
    name                 = "devleep-api"
    image_tag_mutability = "MUTABLE"
    image_scanning_configuration {
        scan_on_push = true
    }
}

resource "aws_ecr_repository" "worker" {
    name                 = "devleep-worker"
    image_tag_mutability = "MUTABLE"
    image_scanning_configuration {
        scan_on_push = true
    }
}