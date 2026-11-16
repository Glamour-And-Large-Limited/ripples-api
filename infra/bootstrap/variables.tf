variable "aws_region" {
  type        = string
  description = "AWS region for shared bootstrap resources"
  default     = "eu-west-1"
}

variable "github_org" {
  type        = string
  description = "GitHub organization or user that owns the repo"
  default     = "Glamour-And-Large-Limited"
}

variable "github_org_id" {
  type        = string
  description = "GitHub organization ID included in the Actions OIDC subject"
  default     = "355468796"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
  default     = "ripples-api"
}

variable "state_bucket_name" {
  type        = string
  description = "S3 bucket for Terraform remote state"
  default     = "ripples-terraform-state"
}

variable "lock_table_name" {
  type        = string
  description = "DynamoDB table for Terraform state locking"
  default     = "ripples-terraform-locks"
}
