data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "ripples-staging"
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix       = local.name_prefix
  environment       = "staging"
  vpc_cidr          = "10.10.0.0/16"
  azs               = local.azs
  nat_gateway_count = 1
  enable_flow_logs  = false
  alb_ingress_cidrs = var.alb_ingress_cidrs
}

module "storage" {
  source = "../../modules/storage"

  name_prefix          = local.name_prefix
  environment          = "staging"
  media_bucket_name    = "ripples-staging-media"
  alb_logs_bucket_name = "ripples-staging-alb-logs"
  cors_origins         = [var.cors_origin]
  enable_versioning    = false
  force_destroy        = true
}

module "alb" {
  source = "../../modules/alb"

  name_prefix                = local.name_prefix
  environment                = "staging"
  vpc_id                     = module.vpc.vpc_id
  public_subnet_ids          = module.vpc.public_subnet_ids
  alb_security_group_id      = module.vpc.alb_security_group_id
  access_logs_bucket_name    = module.storage.alb_logs_bucket_name
  acm_certificate_arn        = var.acm_certificate_arn
  enable_deletion_protection = false
}

module "database" {
  source = "../../modules/database"

  name_prefix             = local.name_prefix
  environment             = "staging"
  private_data_subnet_ids = module.vpc.private_data_subnet_ids
  rds_security_group_id   = module.vpc.rds_security_group_id
  instance_class          = "db.t4g.micro"
  multi_az                = false
  deletion_protection     = false
  skip_final_snapshot     = true
  backup_retention_period = 3
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix          = local.name_prefix
  environment          = "staging"
  postgres_host        = module.database.db_endpoint
  postgres_port        = module.database.db_port
  postgres_user        = module.database.db_username
  postgres_password    = module.database.db_password
  postgres_db          = module.database.db_name
  cors_origin          = var.cors_origin
  swagger_enabled      = true
  typeorm_sync         = true
  regions_seed_on_boot = false
  s3_media_bucket      = module.storage.media_bucket_name
  aws_region           = var.aws_region
}

module "ecs" {
  source = "../../modules/ecs_service"

  name_prefix            = local.name_prefix
  environment            = "staging"
  private_app_subnet_ids = module.vpc.private_app_subnet_ids
  ecs_security_group_id  = module.vpc.ecs_security_group_id
  target_group_arn       = module.alb.target_group_arn
  ecr_repository_url     = var.ecr_repository_url
  image_tag              = var.image_tag
  app_secret_arn         = module.secrets.app_secret_arn
  media_bucket_arn       = module.storage.media_bucket_arn
  cpu                    = 512
  memory                 = 1024
  desired_count          = 1
  aws_region             = var.aws_region
}
