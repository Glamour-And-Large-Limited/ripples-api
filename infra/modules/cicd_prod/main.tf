locals {
  tags = merge(var.tags, { Environment = "prod" })
}

resource "aws_s3_bucket" "promote" {
  bucket        = "ripples-prod-promote"
  force_destroy = false
  tags          = merge(local.tags, { Name = "ripples-prod-promote" })
}

resource "aws_s3_bucket_versioning" "promote" {
  bucket = aws_s3_bucket.promote.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "promote" {
  bucket = aws_s3_bucket.promote.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "promote" {
  bucket = aws_s3_bucket.promote.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket        = "ripples-prod-pipeline-artifacts"
  force_destroy = true
  tags          = merge(local.tags, { Name = "ripples-prod-pipeline-artifacts" })
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "pipeline" {
  statement {
    sid    = "Artifacts"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:GetBucketLocation",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.pipeline_artifacts.arn,
      "${aws_s3_bucket.pipeline_artifacts.arn}/*",
      aws_s3_bucket.promote.arn,
      "${aws_s3_bucket.promote.arn}/*",
    ]
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
      "ecs:TagResource",
    ]
    resources = ["*"]
  }

  statement {
    sid     = "PassRoles"
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      var.task_execution_role_arn,
      var.task_role_arn,
    ]
  }

  statement {
    sid    = "EcrRead"
    effect = "Allow"
    actions = [
      "ecr:DescribeImages",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [var.ecr_repository_arn]
  }

  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.approval_sns_topic_arn != "" ? [1] : []
    content {
      sid       = "ApprovalNotify"
      effect    = "Allow"
      actions   = ["sns:Publish"]
      resources = [var.approval_sns_topic_arn]
    }
  }
}

resource "aws_iam_role_policy" "pipeline" {
  name   = "ripples-codepipeline-prod-policy"
  role   = element(split("/", var.codepipeline_role_arn), length(split("/", var.codepipeline_role_arn)) - 1)
  policy = data.aws_iam_policy_document.pipeline.json
}

resource "aws_codepipeline" "prod" {
  name     = "${var.name_prefix}-promote"
  role_arn = var.codepipeline_role_arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "PromoteManifest"
      category         = "Source"
      owner            = "AWS"
      provider         = "S3"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        S3Bucket             = aws_s3_bucket.promote.bucket
        S3ObjectKey          = "promote/imagedefinitions.json"
        PollForSourceChanges = true
      }
    }
  }

  stage {
    name = "Approve"

    action {
      name     = "ManualApproval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = var.approval_sns_topic_arn != "" ? {
        NotificationArn = var.approval_sns_topic_arn
        CustomData      = "Approve promotion of the preprod image to production ECS."
        } : {
        CustomData = "Approve promotion of the preprod image to production ECS."
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "DeployProdEcs"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ClusterName = var.ecs_cluster_name
        ServiceName = var.ecs_service_name
        FileName    = "imagedefinitions.json"
      }
    }
  }

  tags = local.tags
}
