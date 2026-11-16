variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "access_logs_bucket_name" {
  type = string
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM cert ARN; when empty, HTTP:80 forwards to the target group"
  default     = ""
}

variable "enable_deletion_protection" {
  type    = bool
  default = false
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}

variable "tags" {
  type    = map(string)
  default = {}
}
