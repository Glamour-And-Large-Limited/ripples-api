output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_task_definition_family" {
  value = module.ecs.task_definition_family
}

output "media_bucket_name" {
  value = module.storage.media_bucket_name
}

output "app_secret_arn" {
  value = module.secrets.app_secret_arn
}

output "image_digest_parameter" {
  value = aws_ssm_parameter.image_digest.name
}
