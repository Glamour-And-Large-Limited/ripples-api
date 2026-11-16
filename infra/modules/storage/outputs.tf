output "media_bucket_name" {
  value = aws_s3_bucket.media.bucket
}

output "media_bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "media_bucket_region" {
  value = data.aws_region.current.name
}

output "alb_logs_bucket_name" {
  value = aws_s3_bucket.alb_logs.bucket
}

output "alb_logs_bucket_arn" {
  value = aws_s3_bucket.alb_logs.arn
}
