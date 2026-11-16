output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "pipeline_name" {
  value = module.cicd.pipeline_name
}

output "promote_bucket_name" {
  value = module.cicd.promote_bucket_name
}

output "media_bucket_name" {
  value = module.storage.media_bucket_name
}

output "app_secret_arn" {
  value = module.secrets.app_secret_arn
}
