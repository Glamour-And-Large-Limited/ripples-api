terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "ripples-terraform-state"
    key            = "envs/preprod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "ripples-terraform-locks"
    encrypt        = true
  }
}
