provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ripples"
      Environment = "preprod"
      ManagedBy   = "terraform"
    }
  }
}
