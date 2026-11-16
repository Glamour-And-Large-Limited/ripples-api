variable "name_prefix" {
  type    = string
  default = "ripples-prod"
}

variable "aws_region" {
  type = string
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "ecs_container_name" {
  type = string
}

variable "task_execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "codepipeline_role_arn" {
  type        = string
  description = "Shared CodePipeline/CodeBuild role from bootstrap"
}

variable "approval_sns_topic_arn" {
  type        = string
  description = "Optional SNS topic for manual approval notifications"
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
