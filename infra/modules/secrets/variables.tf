variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "postgres_host" {
  type = string
}

variable "postgres_port" {
  type = number
}

variable "postgres_user" {
  type = string
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "postgres_db" {
  type = string
}

variable "cors_origin" {
  type = string
}

variable "swagger_enabled" {
  type = bool
}

variable "typeorm_sync" {
  type    = bool
  default = false
}

variable "regions_seed_on_boot" {
  type    = bool
  default = false
}

variable "s3_media_bucket" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
