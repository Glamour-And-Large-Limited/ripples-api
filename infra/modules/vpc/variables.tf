variable "name_prefix" {
  type        = string
  description = "Prefix for resource names, e.g. ripples-staging"
}

variable "environment" {
  type        = string
  description = "Environment name: staging | preprod | prod"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "azs" {
  type        = list(string)
  description = "Exactly two availability zones"
}

variable "nat_gateway_count" {
  type        = number
  description = "1 for staging/preprod, 2 for prod (one per AZ)"
  default     = 1
}

variable "enable_flow_logs" {
  type        = bool
  description = "Send VPC flow logs to CloudWatch"
  default     = false
}

variable "alb_ingress_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach the ALB on 80/443"
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  type        = map(string)
  description = "Extra tags"
  default     = {}
}
