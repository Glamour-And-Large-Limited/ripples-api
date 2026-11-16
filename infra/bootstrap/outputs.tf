output "aws_region" {
  value = var.aws_region
}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.bucket
}

output "lock_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_repository_arn" {
  value = aws_ecr_repository.api.arn
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}

output "gha_staging_role_arn" {
  value = aws_iam_role.gha["staging"].arn
}

output "gha_preprod_role_arn" {
  value = aws_iam_role.gha["preprod"].arn
}

output "codepipeline_prod_role_arn" {
  value = aws_iam_role.codepipeline_prod.arn
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
