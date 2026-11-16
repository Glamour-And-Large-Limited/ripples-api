# Ripples AWS infrastructure

Terraform for staging, preprod, and prod on AWS (`eu-west-1` by default): VPC, ALB, ECS Fargate, RDS Postgres 17, S3 (media + ALB logs), Secrets Manager, plus GitHub Actions OIDC deploy for lower envs and a gated CodePipeline promote to prod.

## Layout

```
infra/
  bootstrap/     # one-time: state bucket, lock table, ECR, GHA OIDC roles
  modules/       # vpc, alb, ecs_service, database, storage, secrets, cicd_prod
  envs/          # staging | preprod | prod
```

## Prerequisites

- Terraform `>= 1.6`
- AWS credentials with rights to create the bootstrap resources
- GitHub repo `glamourandlarge-arch/ripples-api` (override via bootstrap tfvars)
- GitHub Environments `staging` and `preprod`, each with secret `AWS_ROLE_ARN`
- Branches: `main` → staging, `preprod` → preprod (prod is pipeline-only)

## 1. Bootstrap (once)

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars   # edit org/repo if needed
terraform init
terraform apply
```

Copy outputs:

| Output | Use |
|---|---|
| `state_bucket_name` / `lock_table_name` | Already wired into env backends |
| `ecr_repository_url` / `ecr_repository_arn` | Env tfvars |
| `gha_staging_role_arn` | GitHub Environment `staging` → `AWS_ROLE_ARN` |
| `gha_preprod_role_arn` | GitHub Environment `preprod` → `AWS_ROLE_ARN` |
| `codepipeline_prod_role_arn` | Prod tfvars |

## 2. Apply environments

Order: staging → preprod → prod.

```bash
cd infra/envs/staging
cp terraform.tfvars.example terraform.tfvars
# set ecr_repository_url (and cors_origin / ACM if ready)
terraform init
terraform apply
```

Repeat for `preprod` and `prod`. Prod also needs `ecr_repository_arn` and `codepipeline_role_arn`.

### Sizing

| | Staging | Preprod | Prod |
|---|---|---|---|
| VPC CIDR | `10.10.0.0/16` | `10.20.0.0/16` | `10.30.0.0/16` |
| NAT | 1 | 1 | 2 (per AZ) |
| ECS desired | 1 | 2 | 2 |
| RDS | `db.t4g.micro` | `db.t4g.small` | `db.t4g.medium` Multi-AZ |
| Swagger | on | on | off |
| `TYPEORM_SYNC` | true (empty DB bootstrap) | false | false |

### Network path

Internet → ALB (public) → ECS tasks (private app) → RDS (private data, no NAT). S3 via gateway endpoint. ECS egress HTTPS via NAT for seed URLs / peers / AWS APIs.

## 3. First image and deploy

Terraform registers an initial task definition pointing at `:staging` / `:preprod` / `:prod`. Push an image before (or immediately after) apply so the service can start:

```bash
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.eu-west-1.amazonaws.com

docker build -t <ecr>/ripples-api:staging .
docker push <ecr>/ripples-api:staging
```

Then either force a new deployment or push to `main` / `preprod` to run the GitHub Actions workflows.

### GitHub Actions

- `ci.yml` — lint, typecheck, unit, e2e (Postgres service)
- `deploy-staging.yml` — on `main`: CI → build/push → ECS rolling update
- `deploy-preprod.yml` — on `preprod`: same, then writes SSM `/ripples/preprod/image_digest` and uploads a zipped `imagedefinitions.json` to `s3://ripples-prod-promote/promote/imagedefinitions.json` for CodePipeline

## 4. Promote to production

1. Confirm preprod is healthy (`https://<alb_dns>/api/health` or custom domain).
2. In AWS Console → CodePipeline → `ripples-prod-promote` → approve the **ManualApproval** stage  
   or: `aws codepipeline get-pipeline-state --name ripples-prod-promote`
3. After approval, ECS prod rolls to the same image digest that ran in preprod (no rebuild).

## 5. Operator notes

### ALB DNS

```bash
terraform -chdir=infra/envs/staging output alb_dns_name
```

Point a Route53 alias (or external DNS) at that name. Set `acm_certificate_arn` so listener 80 redirects to HTTPS 443; without a cert, staging/preprod forward HTTP:80 for early smoke tests.

### App env / secrets

Runtime env lives in Secrets Manager: `ripples-{env}/app/env` (JSON). ECS injects keys into the task. After changing the secret, force a new deployment.

Important deployed defaults:

- `HTTP_TRUST_PROXY=true`
- `POSTGRES_SSL=true`
- `REGIONS_SEED_ON_BOOT=false`
- `TYPEORM_SYNC=true` only on staging (first empty DB); turn off after schema is stable
- `SWAGGER_ENABLED=false` in prod

### One-off regions seed

```bash
# Run a one-off ECS task with the same task def, overriding command if you add a seed entrypoint,
# or exec against a temporary task / bastion once migrations exist.
# Local equivalent after VPN/bastion to RDS:
pnpm seed:regions
```

Until a dedicated seed task definition exists, prefer a short-lived ECS run-task with `REGIONS_SEED_ON_BOOT=true` on an empty DB, then leave the flag false.

### OTP

OTP still uses console/log senders. SES/SNS is a follow-up; do not treat SMS delivery as production-ready yet.

### Known follow-ups

- TypeORM migrations (replace `TYPEORM_SYNC`)
- Nest S3 upload client (bucket + IAM already provisioned)
- SES/SNS for OTP
- WAF / CloudFront in front of the ALB
- ElastiCache in reserved `10.x.30/31` CIDRs when messaging is enabled

## Destroy caution

Prod has deletion protection on ALB and RDS. Staging/preprod S3 buckets allow `force_destroy` for teardown. Never destroy bootstrap state bucket while env states still depend on it.
