output "promote_bucket_name" {
  value = aws_s3_bucket.promote.bucket
}

output "pipeline_name" {
  value = aws_codepipeline.prod.name
}

output "pipeline_arn" {
  value = aws_codepipeline.prod.arn
}

output "artifacts_bucket_name" {
  value = aws_s3_bucket.pipeline_artifacts.bucket
}
