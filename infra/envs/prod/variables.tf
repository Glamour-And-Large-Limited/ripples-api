variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "ecr_repository_url" {
  type = string
}

variable "ecr_repository_arn" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "prod"
}

variable "cors_origin" {
  type = string
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "alb_ingress_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "codepipeline_role_arn" {
  type        = string
  description = "From infra/bootstrap output codepipeline_prod_role_arn"
}

variable "approval_sns_topic_arn" {
  type    = string
  default = ""
}
