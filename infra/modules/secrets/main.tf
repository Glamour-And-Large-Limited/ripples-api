locals {
  tags = merge(var.tags, { Environment = var.environment })
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "random_password" "service_shared" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name_prefix}/app/env"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    PORT                          = "8000"
    POSTGRES_HOST                 = var.postgres_host
    POSTGRES_PORT                 = tostring(var.postgres_port)
    POSTGRES_USER                 = var.postgres_user
    POSTGRES_PASSWORD             = var.postgres_password
    POSTGRES_DB                   = var.postgres_db
    POSTGRES_SSL                  = "true"
    CORS_ORIGIN                   = var.cors_origin
    HTTP_TRUST_PROXY              = "true"
    SWAGGER_ENABLED               = var.swagger_enabled ? "true" : "false"
    SERVICE_NAME                  = "ripples-api"
    SERVICE_SHARED_SECRET         = random_password.service_shared.result
    PEERS                         = ""
    MESSAGING_ENABLED             = "false"
    MESSAGING_TRANSPORT           = "tcp"
    MESSAGING_HOST                = "127.0.0.1"
    MESSAGING_PORT                = "8001"
    JWT_SECRET                    = random_password.jwt.result
    JWT_EXPIRES_IN                = "1h"
    OTP_TTL_SECONDS               = "300"
    OTP_DEBUG                     = var.environment == "prod" ? "false" : "true"
    OTP_RATE_LIMIT_MAX            = "5"
    OTP_RATE_LIMIT_WINDOW_SECONDS = "900"
    REGIONS_SEED_ON_BOOT          = var.regions_seed_on_boot ? "true" : "false"
    TYPEORM_SYNC                  = var.typeorm_sync ? "true" : "false"
    AWS_REGION                    = var.aws_region
    S3_MEDIA_BUCKET               = var.s3_media_bucket
  })
}
