data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

locals {
  github_sub_prefix = "repo:${var.github_org}/${var.github_repo}"
  account_id        = data.aws_caller_identity.current.account_id
}

data "aws_iam_policy_document" "gha_assume" {
  for_each = toset(["staging", "preprod"])

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "${local.github_sub_prefix}:ref:refs/heads/${each.key == "staging" ? "main" : "preprod"}",
        "${local.github_sub_prefix}:environment:${each.key}",
        "${local.github_sub_prefix}:pull_request",
      ]
    }
  }
}

resource "aws_iam_role" "gha" {
  for_each = toset(["staging", "preprod"])

  name               = "ripples-gha-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.gha_assume[each.key].json
}

data "aws_iam_policy_document" "gha_deploy" {
  for_each = toset(["staging", "preprod"])

  statement {
    sid    = "EcrAuth"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [aws_ecr_repository.api.arn]
  }

  statement {
    sid    = "EcsDeploy"
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Environment"
      values   = [each.key]
    }
  }

  statement {
    sid    = "EcsUntaggedReads"
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
      "ecs:DescribeClusters",
      "ecs:ListClusters",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "PassEcsRoles"
    effect = "Allow"
    actions = [
      "iam:PassRole",
    ]
    resources = [
      "arn:aws:iam::${local.account_id}:role/ripples-${each.key}-*",
    ]
  }

  statement {
    sid    = "SsmImageDigest"
    effect = "Allow"
    actions = [
      "ssm:PutParameter",
      "ssm:GetParameter",
      "ssm:AddTagsToResource",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/ripples/${each.key}/*",
    ]
  }

  statement {
    sid    = "PromoteArtifact"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::ripples-prod-promote",
      "arn:aws:s3:::ripples-prod-promote/*",
    ]
  }
}

resource "aws_iam_role_policy" "gha_deploy" {
  for_each = toset(["staging", "preprod"])

  name   = "ripples-gha-${each.key}-deploy"
  role   = aws_iam_role.gha[each.key].id
  policy = data.aws_iam_policy_document.gha_deploy[each.key].json
}

data "aws_iam_policy_document" "codepipeline_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com", "codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codepipeline_prod" {
  name               = "ripples-codepipeline-prod"
  assume_role_policy = data.aws_iam_policy_document.codepipeline_assume.json
}
