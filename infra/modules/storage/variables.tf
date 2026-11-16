variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "media_bucket_name" {
  type = string
}

variable "alb_logs_bucket_name" {
  type = string
}

variable "cors_origins" {
  type    = list(string)
  default = []
}

variable "enable_versioning" {
  type    = bool
  default = false
}

variable "force_destroy" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
