#!/usr/bin/env bash
# Poll ECS until the service is stable, then write the deployment summary.
set -euo pipefail

attempts=40
delay=15
stable=0
failed=0
public_url="${SERVICE_URL:-}"
health_path="${HEALTH_PATH:-/api/health}"
health_result="Not checked"
service_json='{"services":[]}'

echo "Waiting for ${ECS_SERVICE} to become stable."
echo "A check runs every ${delay}s for up to $((attempts * delay / 60)) minutes."

for ((attempt = 1; attempt <= attempts; attempt++)); do
  if ! service_json=$(aws ecs describe-services \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --output json); then
    service_json='{"services":[]}'
  fi

  primary=$(echo "$service_json" | jq -r '
    [.services[0].deployments[]? | select(.status == "PRIMARY") | .rolloutState] | first // "unknown"
  ' || true)
  running=$(echo "$service_json" | jq -r '.services[0].runningCount // "?"' || true)
  desired=$(echo "$service_json" | jq -r '.services[0].desiredCount // "?"' || true)
  pending=$(echo "$service_json" | jq -r '.services[0].pendingCount // "?"' || true)
  echo "Check ${attempt}/${attempts}: rollout ${primary}, ${running}/${desired} running, ${pending} pending."

  if echo "$service_json" | jq -e 'any(.services[0].deployments[]?; .rolloutState == "FAILED")' >/dev/null; then
    failed=1
    break
  fi

  if echo "$service_json" | jq -e '
    (.services[0].deployments | length) > 0
    and all(.services[0].deployments[]?; .rolloutState == "COMPLETED")
    and (.services[0].runningCount == .services[0].desiredCount)
    and (.services[0].pendingCount == 0)
  ' >/dev/null; then
    stable=1
    break
  fi

  if ((attempt < attempts)); then
    sleep "$delay"
  fi
done

task_def=$(echo "$service_json" | jq -r '.services[0].taskDefinition // "unknown"' || true)
task_label="${task_def##*/}"
failed_tasks=$(echo "$service_json" | jq -r '
  [.services[0].deployments[]? | select(.status == "PRIMARY") | .failedTasks] | first // 0
' || true)
event=$(echo "$service_json" | jq -r '.services[0].events[0].message // "No recent service events."' || true)
event=${event//$'\n'/ }
event=${event//|/\/}
image="${IMAGE_URI:-unknown}"
if [[ "$task_def" != "unknown" ]]; then
  described_image=$(aws ecs describe-task-definition \
    --task-definition "$task_def" \
    --query "taskDefinition.containerDefinitions[?name=='${CONTAINER_NAME}'].image | [0]" \
    --output text 2>/dev/null || true)
  if [[ -n "$described_image" && "$described_image" != "None" ]]; then
    image="$described_image"
  fi
fi

if [[ -z "$public_url" ]]; then
  target_group=$(echo "$service_json" | jq -r '.services[0].loadBalancers[0].targetGroupArn // empty' || true)
  if [[ -n "$target_group" ]]; then
    load_balancer=$(aws elbv2 describe-target-groups \
      --target-group-arns "$target_group" \
      --query 'TargetGroups[0].LoadBalancerArns[0]' \
      --output text 2>/dev/null || true)
    if [[ -n "$load_balancer" && "$load_balancer" != "None" ]]; then
      dns_name=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$load_balancer" \
        --query 'LoadBalancers[0].DNSName' \
        --output text 2>/dev/null || true)
      https_port=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$load_balancer" \
        --query 'Listeners[?Port==`443`].Port | [0]' \
        --output text 2>/dev/null || true)
      if [[ -n "$dns_name" && "$dns_name" != "None" ]]; then
        if [[ "$https_port" == "443" ]]; then
          public_url="https://${dns_name}"
        else
          public_url="http://${dns_name}"
        fi
      fi
    fi
  fi
fi

ecs_stable=$stable
if [[ -n "$public_url" ]]; then
  health_url="${public_url%/}${health_path}"
  health_code=$(curl -sS -o /tmp/ripples-health-body -w "%{http_code}" --max-time 20 "$health_url" || echo "000")
  if [[ "$health_code" == "200" ]]; then
    health_result="Passed (${health_code}) at ${health_url}"
  else
    health_result="Failed (${health_code}) at ${health_url}"
    stable=0
  fi
fi

stable_at=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
short_sha="${GITHUB_SHA:0:7}"
commit_subject=$(git log -1 --format='%s' 2>/dev/null || true)
commit_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/commit/${GITHUB_SHA}"
environment_name="${DEPLOY_ENVIRONMENT:-deployment}"
summary_title="$(printf '%s' "$environment_name" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"

if [[ "$stable" -eq 1 ]]; then
  headline="Service is stable"
  detail="${ECS_SERVICE} is stable again as of ${stable_at}. ${running}/${desired} tasks are running."
  deployment_state="success"
  echo "$detail"
  echo "::notice title=Service stable::${detail}"
elif [[ "$ecs_stable" -eq 1 ]]; then
  headline="Service is not healthy"
  detail="${ECS_SERVICE} finished rolling out, but the health check has not passed. ${health_result}."
  deployment_state="failure"
  echo "$detail"
  echo "::error title=Service not healthy::${detail}"
else
  headline="Service is not stable"
  if [[ "$failed" -eq 1 ]]; then
    detail="${ECS_SERVICE} rollout failed. ${running}/${desired} tasks are running."
  else
    detail="${ECS_SERVICE} did not become stable within $((attempts * delay / 60)) minutes. Rollout is ${primary}. ${running}/${desired} tasks are running."
  fi
  deployment_state="failure"
  echo "$detail"
  echo "::error title=Service not stable::${detail}"
fi

{
  echo "## ${summary_title} deployment"
  echo
  echo "**${headline}.** ${detail}"
  echo
  echo "| | |"
  echo "| --- | --- |"
  echo "| Service | \`${ECS_SERVICE}\` |"
  echo "| Cluster | \`${ECS_CLUSTER}\` |"
  echo "| Region | \`${AWS_REGION}\` |"
  echo "| Rollout | ${primary} |"
  echo "| Tasks | ${running} running / ${desired} desired, ${pending} pending |"
  echo "| Failed tasks | ${failed_tasks} |"
  echo "| Task definition | \`${task_label}\` |"
  echo "| Image | \`${image}\` |"
  echo "| Commit | [\`${short_sha}\`](${commit_url}) ${commit_subject} |"
  echo "| Health | ${health_result} |"
  if [[ -n "$public_url" ]]; then
    echo "| Service URL | ${public_url} |"
  fi
  echo "| Checked at | ${stable_at} |"
  echo
  echo "Latest service event: ${event}"
} >>"${GITHUB_STEP_SUMMARY}"

description="${headline}. ${running}/${desired} tasks running."
description="${description:0:140}"
deployment_id=$(gh api --jq '.[0].id // empty' \
  "repos/${GITHUB_REPOSITORY}/deployments?environment=${environment_name}&sha=${GITHUB_SHA}&per_page=5" \
  2>/dev/null || true)
if [[ -n "$deployment_id" ]]; then
  status_args=(
    --method POST
    -f "state=${deployment_state}"
    -f "description=${description}"
    -f "log_url=${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
  )
  if [[ -n "$public_url" ]]; then
    status_args+=(-f "environment_url=${public_url}")
  fi
  gh api "repos/${GITHUB_REPOSITORY}/deployments/${deployment_id}/statuses" "${status_args[@]}" >/dev/null \
    || echo "Could not update the GitHub deployment status."
fi

if [[ "$stable" -ne 1 ]]; then
  exit 1
fi
