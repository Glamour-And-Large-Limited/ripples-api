data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "ripples-prod"
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix       = local.name_prefix
  environment       = "prod"
  vpc_cidr          = "10.30.0.0/16"
  azs               = local.azs
  nat_gateway_count = 2
  enable_flow_logs  = true
  alb_ingress_cidrs = var.alb_ingress_cidrs
}

module "storage" {
  source = "../../modules/storage"

  name_prefix          = local.name_prefix
  environment          = "prod"
  media_bucket_name    = "ripples-prod-media"
  alb_logs_bucket_name = "ripples-prod-alb-logs"
  cors_origins         = [var.cors_origin]
  enable_versioning    = true
  force_destroy        = false
}

module "alb" {
  source = "../../modules/alb"

  name_prefix                = local.name_prefix
  environment                = "prod"
  vpc_id                     = module.vpc.vpc_id
  public_subnet_ids          = module.vpc.public_subnet_ids
  alb_security_group_id      = module.vpc.alb_security_group_id
  access_logs_bucket_name    = module.storage.alb_logs_bucket_name
  acm_certificate_arn        = var.acm_certificate_arn
  enable_deletion_protection = true
}

module "database" {
  source = "../../modules/database"

  name_prefix             = local.name_prefix
  environment             = "prod"
  private_data_subnet_ids = module.vpc.private_data_subnet_ids
  rds_security_group_id   = module.vpc.rds_security_group_id
  instance_class          = "db.t4g.medium"
  multi_az                = true
  deletion_protection     = true
  skip_final_snapshot     = false
  backup_retention_period = 14
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix          = local.name_prefix
  environment          = "prod"
  postgres_host        = module.database.db_endpoint
  postgres_port        = module.database.db_port
  postgres_user        = module.database.db_username
  postgres_password    = module.database.db_password
  postgres_db          = module.database.db_name
  cors_origin          = var.cors_origin
  swagger_enabled      = false
  typeorm_sync         = false
  regions_seed_on_boot = false
  s3_media_bucket      = module.storage.media_bucket_name
  aws_region           = var.aws_region
}

module "ecs" {
  source = "../../modules/ecs_service"

  name_prefix            = local.name_prefix
  environment            = "prod"
  private_app_subnet_ids = module.vpc.private_app_subnet_ids
  ecs_security_group_id  = module.vpc.ecs_security_group_id
  target_group_arn       = module.alb.target_group_arn
  ecr_repository_url     = var.ecr_repository_url
  image_tag              = var.image_tag
  app_secret_arn         = module.secrets.app_secret_arn
  media_bucket_arn       = module.storage.media_bucket_arn
  cpu                    = 1024
  memory                 = 2048
  desired_count          = 2
  aws_region             = var.aws_region
}

module "cicd" {
  source = "../../modules/cicd_prod"

  name_prefix             = local.name_prefix
  aws_region              = var.aws_region
  ecr_repository_arn      = var.ecr_repository_arn
  ecr_repository_url      = var.ecr_repository_url
  ecs_cluster_name        = module.ecs.cluster_name
  ecs_service_name        = module.ecs.service_name
  ecs_container_name      = module.ecs.container_name
  task_execution_role_arn = module.ecs.execution_role_arn
  task_role_arn           = module.ecs.task_role_arn
  codepipeline_role_arn   = var.codepipeline_role_arn
  approval_sns_topic_arn  = var.approval_sns_topic_arn
}
