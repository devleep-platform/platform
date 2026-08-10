resource "aws_iam_openid_connect_provider" "github" {
    url = "https://token.actions.githubusercontent.com"
    client_id_list = ["sts.amazonaws.com"]
    
    
}

data "aws_iam_policy_document" "github_oidc_assume_role_policy" {
    statement {
        actions = ["sts:AssumeRoleWithWebIdentity"]
        effect  = "Allow"
        principals {
            type        = "Federated"
            identifiers = [aws_iam_openid_connect_provider.github.arn]
        }
        condition {
            test     = "StringEquals"
            variable = "token.actions.githubusercontent.com:aud"
            values   = ["sts.amazonaws.com"]
        }
    }
}