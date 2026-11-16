variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "preprod"
}

variable "cors_origin" {
  type    = string
  default = "http://localhost:3000"
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "alb_ingress_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}
