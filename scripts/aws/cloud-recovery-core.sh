#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-982081079378}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-Z002814819T09BLDX47MG}"
ROOT_DOMAIN="${ROOT_DOMAIN:-handycall.org}"
API_DOMAIN="${API_DOMAIN:-api.handycall.org}"
VOICE_DOMAIN="${VOICE_DOMAIN:-voice.handycall.org}"
WWW_DOMAIN="${WWW_DOMAIN:-www.handycall.org}"
TEST_NUMBER_E164="${TEST_NUMBER_E164:-+18324605974}"

BACKEND_APP="handycall-api"
BACKEND_ENV="handycall-api-lb"
VOICE_APP="handycall-voice-bridge"
VOICE_ENV="handycall-voice-bridge-alb"
WEB_APP="handycall-web"
WEB_ENV="handycall-web-lb"

S3_RECORDINGS="handycall-recordings-dev-${AWS_ACCOUNT_ID}"
S3_TRANSCRIPTS="handycall-transcripts-dev-${AWS_ACCOUNT_ID}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOURCE_ENV_ROOT_DEFAULT="$(cd "${REPO_ROOT}/.." && pwd)/HandyCall.ai"
SOURCE_ENV_ROOT="${SOURCE_ENV_ROOT:-$SOURCE_ENV_ROOT_DEFAULT}"

log() { printf '[cloud-recovery] %s\n' "$*"; }
fail() { printf '[cloud-recovery][error] %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

env_read() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(grep -E "^${key}=" "$file" | tail -1 || true)"
  [[ -n "$line" ]] || return 0
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

eb_env_exists() {
  local app="$1" env="$2"
  local status
  status="$(aws elasticbeanstalk describe-environments --application-name "$app" --environment-names "$env" --include-deleted --region "$AWS_REGION" --query 'Environments[0].Status' --output text 2>/dev/null || true)"
  [[ -n "$status" && "$status" != "None" && "$status" != "Terminated" ]]
}

ensure_eb_app() {
  local app="$1"
  local found
  found="$(aws elasticbeanstalk describe-applications --region "$AWS_REGION" --query "Applications[?ApplicationName=='${app}'].ApplicationName" --output text)"
  if [[ "$found" != "$app" ]]; then
    log "Creating EB app $app"
    aws elasticbeanstalk create-application --application-name "$app" --region "$AWS_REGION" >/dev/null
  fi
}

ensure_ecr_repo() {
  local repo="$1"
  aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name "$repo" --region "$AWS_REGION" >/dev/null
}

ensure_cert() {
  local domain="$1"
  local sans_csv="${2:-}"
  local cert_arn
  local status
  local records_json

  upsert_validation_records() {
    local validation_records="$1"
    [[ "$(echo "$validation_records" | jq 'length')" -gt 0 ]] || return 0
    local change_file
    change_file="$(mktemp)"
    jq -n --argjson records "$validation_records" '{Comment:"ACM validation",Changes:($records|map({Action:"UPSERT",ResourceRecordSet:{Name:.Name,Type:.Type,TTL:300,ResourceRecords:[{Value:.Value}]}}))}' > "$change_file"
    aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "file://$change_file" >/dev/null
    rm -f "$change_file"
  }

  cert_arn="$(aws acm list-certificates --region "$AWS_REGION" --query "CertificateSummaryList[?DomainName=='${domain}'].CertificateArn | [0]" --output text)"
  if [[ -n "$cert_arn" && "$cert_arn" != "None" ]]; then
    status="$(aws acm describe-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" --query 'Certificate.Status' --output text)"
    if [[ "$status" != "ISSUED" ]]; then
      records_json="$(aws acm describe-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json)"
      upsert_validation_records "$records_json"
      log "Waiting for ACM validation on $domain"
      aws acm wait certificate-validated --certificate-arn "$cert_arn" --region "$AWS_REGION"
    fi
    printf '%s' "$cert_arn"
    return 0
  fi

  if [[ -n "$sans_csv" ]]; then
    cert_arn="$(aws acm request-certificate --domain-name "$domain" --subject-alternative-names "$sans_csv" --validation-method DNS --region "$AWS_REGION" --query CertificateArn --output text)"
  else
    cert_arn="$(aws acm request-certificate --domain-name "$domain" --validation-method DNS --region "$AWS_REGION" --query CertificateArn --output text)"
  fi

  records_json='[]'
  local tries
  for tries in {1..20}; do
    records_json="$(aws acm describe-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json)"
    if [[ "$(echo "$records_json" | jq 'length')" -gt 0 ]]; then
      break
    fi
    sleep 3
  done

  upsert_validation_records "$records_json"

  log "Waiting for ACM validation on $domain"
  aws acm wait certificate-validated --certificate-arn "$cert_arn" --region "$AWS_REGION"
  printf '%s' "$cert_arn"
}

create_env_if_missing() {
  local app="$1" env="$2" cert_arn="$3" options_file="$4"
  if eb_env_exists "$app" "$env"; then
    log "EB env exists: $app/$env"
    return 0
  fi

  log "Creating EB env $app/$env"
  aws elasticbeanstalk create-environment \
    --application-name "$app" \
    --environment-name "$env" \
    --platform-arn "arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.9.0" \
    --option-settings "file://${options_file}" \
    --region "$AWS_REGION" >/dev/null
}

wait_env_green() {
  local app="$1" env="$2"
  log "Waiting for EB env green: $app/$env"
  local attempts=90
  local i
  for ((i=1; i<=attempts; i++)); do
    local status health
    status="$(aws elasticbeanstalk describe-environments --application-name "$app" --environment-names "$env" --region "$AWS_REGION" --query 'Environments[0].Status' --output text)"
    health="$(aws elasticbeanstalk describe-environments --application-name "$app" --environment-names "$env" --region "$AWS_REGION" --query 'Environments[0].Health' --output text)"
    if [[ "$status" == "Ready" && "$health" == "Green" ]]; then
      log "Environment ready: $app/$env"
      return 0
    fi
    sleep 20
  done
  fail "Timed out waiting for EB env $app/$env to become Green"
}

wait_env_ready() {
  local app="$1" env="$2"
  log "Waiting for EB env ready: $app/$env"
  local attempts=90
  local i
  for ((i=1; i<=attempts; i++)); do
    local status
    status="$(aws elasticbeanstalk describe-environments --application-name "$app" --environment-names "$env" --region "$AWS_REGION" --query 'Environments[0].Status' --output text)"
    if [[ "$status" == "Ready" ]]; then
      return 0
    fi
    sleep 20
  done
  fail "Timed out waiting for EB env $app/$env to become Ready"
}

set_env_options() {
  local app="$1" env="$2" options_file="$3"
  aws elasticbeanstalk update-environment \
    --application-name "$app" \
    --environment-name "$env" \
    --option-settings "file://${options_file}" \
    --region "$AWS_REGION" >/dev/null
}

lb_alias_json() {
  local lb_dns="$1" lb_zone_id="$2"
  jq -n --arg dns "$lb_dns" --arg zid "$lb_zone_id" '{HostedZoneId:$zid,DNSName:$dns,EvaluateTargetHealth:true}'
}

get_env_lb_details() {
  local env="$1"
  local lb_name
  lb_name="$(aws elasticbeanstalk describe-environment-resources --environment-name "$env" --region "$AWS_REGION" --query 'EnvironmentResources.LoadBalancers[0].Name' --output text)"
  [[ -n "$lb_name" && "$lb_name" != "None" ]] || fail "No ALB found for env $env"
  local lb_dns lb_zone lb_dimension
  lb_dns="$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --names "$lb_name" --query 'LoadBalancers[0].DNSName' --output text)"
  lb_zone="$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --names "$lb_name" --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)"
  lb_dimension="$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --names "$lb_name" --query 'LoadBalancers[0].LoadBalancerArn' --output text | cut -d: -f6)"
  printf '%s|%s|%s\n' "$lb_dns" "$lb_zone" "$lb_dimension"
}

upsert_dns_aliases() {
  local api_dns="$1" api_zone="$2"
  local voice_dns="$3" voice_zone="$4"
  local web_dns="$5" web_zone="$6"

  local api_alias voice_alias web_alias
  api_alias="$(lb_alias_json "$api_dns" "$api_zone")"
  voice_alias="$(lb_alias_json "$voice_dns" "$voice_zone")"
  web_alias="$(lb_alias_json "$web_dns" "$web_zone")"

  local change_file
  change_file="$(mktemp)"
  jq -n \
    --arg api "$API_DOMAIN" \
    --arg voice "$VOICE_DOMAIN" \
    --arg root "$ROOT_DOMAIN" \
    --arg www "$WWW_DOMAIN" \
    --argjson apiAlias "$api_alias" \
    --argjson voiceAlias "$voice_alias" \
    --argjson webAlias "$web_alias" \
    '{Comment:"HandyCall cloud recovery alias update",Changes:[
      {Action:"UPSERT",ResourceRecordSet:{Name:$api,Type:"A",AliasTarget:$apiAlias}},
      {Action:"UPSERT",ResourceRecordSet:{Name:$voice,Type:"A",AliasTarget:$voiceAlias}},
      {Action:"UPSERT",ResourceRecordSet:{Name:$root,Type:"A",AliasTarget:$webAlias}},
      {Action:"UPSERT",ResourceRecordSet:{Name:$www,Type:"A",AliasTarget:$webAlias}}
    ]}' > "$change_file"

  aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "file://$change_file" >/dev/null
  rm -f "$change_file"
}

put_ssm_secret() {
  local key="$1" value="$2"
  [[ -n "$value" ]] || return 0
  aws ssm put-parameter --name "$key" --value "$value" --type SecureString --overwrite --region "$AWS_REGION" >/dev/null
}

apply_log_retention() {
  local env="$1" days="$2"
  local groups
  groups="$(aws logs describe-log-groups --region "$AWS_REGION" --log-group-name-prefix "/aws/elasticbeanstalk/${env}/" --query 'logGroups[].logGroupName' --output text)"
  for g in $groups; do
    aws logs put-retention-policy --log-group-name "$g" --retention-in-days "$days" --region "$AWS_REGION" >/dev/null
  done
}

put_alarms() {
  local svc="$1" lb_dim="$2"
  aws cloudwatch put-metric-alarm \
    --alarm-name "handycall-${svc}-alb-5xx" \
    --metric-name HTTPCode_ELB_5XX_Count \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=LoadBalancer,Value="$lb_dim" \
    --treat-missing-data notBreaching \
    --region "$AWS_REGION" >/dev/null
}

put_eb_health_alarm() {
  local app="$1" env="$2"
  aws cloudwatch put-metric-alarm \
    --alarm-name "handycall-${env}-health" \
    --metric-name EnvironmentHealth \
    --namespace AWS/ElasticBeanstalk \
    --statistic Average \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 15 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=EnvironmentName,Value="$env" Name=ApplicationName,Value="$app" \
    --treat-missing-data notBreaching \
    --region "$AWS_REGION" >/dev/null
}

health_check() {
  local url="$1"
  local i
  for ((i=1; i<=30; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 10
  done
  return 1
}

get_env_cname() {
  local app="$1" env="$2"
  aws elasticbeanstalk describe-environments \
    --application-name "$app" \
    --environment-names "$env" \
    --region "$AWS_REGION" \
    --query 'Environments[0].CNAME' \
    --output text
}

require_cmd aws
require_cmd docker
require_cmd jq
require_cmd curl

[[ "$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")" == "$AWS_ACCOUNT_ID" ]] || fail "AWS account mismatch"

BACKEND_ENV_FILE="${SOURCE_ENV_ROOT}/packages/backend/.env.local"
WEB_ENV_FILE="${SOURCE_ENV_ROOT}/packages/web/.env.local"
VOICE_ENV_FILE="${SOURCE_ENV_ROOT}/packages/voice-bridge/.env"

OPENAI_API_KEY="$(env_read "$BACKEND_ENV_FILE" OPENAI_API_KEY)"
TWILIO_ACCOUNT_SID="$(env_read "$BACKEND_ENV_FILE" TWILIO_ACCOUNT_SID)"
TWILIO_AUTH_TOKEN="$(env_read "$BACKEND_ENV_FILE" TWILIO_AUTH_TOKEN)"
TWILIO_PHONE_NUMBER="$(env_read "$BACKEND_ENV_FILE" TWILIO_PHONE_NUMBER)"
TOOLS_API_KEY="$(env_read "$BACKEND_ENV_FILE" HANDYCALL_TOOLS_API_KEY)"
JWT_SECRET="$(env_read "$BACKEND_ENV_FILE" JWT_SECRET)"
BOOKING_LINK_SECRET="$(env_read "$BACKEND_ENV_FILE" BOOKING_LINK_SECRET)"
NEXTAUTH_SECRET="$(env_read "$WEB_ENV_FILE" NEXTAUTH_SECRET)"
STRIPE_PUBLISHABLE_KEY="$(env_read "$WEB_ENV_FILE" NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
STRIPE_SECRET_KEY="$(env_read "$BACKEND_ENV_FILE" STRIPE_SECRET_KEY)"
STRIPE_WEBHOOK_SECRET="$(env_read "$BACKEND_ENV_FILE" STRIPE_WEBHOOK_SECRET)"
STRIPE_CONNECT_WEBHOOK_SECRET="$(env_read "$BACKEND_ENV_FILE" STRIPE_CONNECT_WEBHOOK_SECRET)"

[[ -n "$TOOLS_API_KEY" ]] || TOOLS_API_KEY="$(openssl rand -hex 24)"
[[ -n "$JWT_SECRET" ]] || JWT_SECRET="$(openssl rand -hex 32)"
REFRESH_TOKEN_SECRET="$(openssl rand -hex 32)"
[[ -n "$NEXTAUTH_SECRET" ]] || NEXTAUTH_SECRET="$(openssl rand -hex 32)"

USERS_POOL_ID="us-east-1_gBsGtRPnM"
USERS_CLIENT_ID="3vhh0artoakoardoi4e9rdm3m9"
ADMIN_POOL_ID="us-east-1_87I5bQxUW"
ADMIN_CLIENT_ID="3drpp2cjdgtkodoj0d3udh5nu1"
CUSTOMER_POOL_ID="us-east-1_v08KHH5np"
CUSTOMER_CLIENT_ID="3u3ktbcsqlb31uosk4cirvl678"

USERS_CLIENT_SECRET="$(aws cognito-idp describe-user-pool-client --user-pool-id "$USERS_POOL_ID" --client-id "$USERS_CLIENT_ID" --region "$AWS_REGION" --query 'UserPoolClient.ClientSecret' --output text)"
ADMIN_CLIENT_SECRET="$(aws cognito-idp describe-user-pool-client --user-pool-id "$ADMIN_POOL_ID" --client-id "$ADMIN_CLIENT_ID" --region "$AWS_REGION" --query 'UserPoolClient.ClientSecret' --output text)"
CUSTOMER_CLIENT_SECRET="$(aws cognito-idp describe-user-pool-client --user-pool-id "$CUSTOMER_POOL_ID" --client-id "$CUSTOMER_CLIENT_ID" --region "$AWS_REGION" --query 'UserPoolClient.ClientSecret' --output text)"

log "Ensuring ECR repos"
ensure_ecr_repo handycall-backend
ensure_ecr_repo handycall-web
ensure_ecr_repo handycall-voice-bridge

log "Ensuring EB applications"
ensure_eb_app "$BACKEND_APP"
ensure_eb_app "$WEB_APP"
ensure_eb_app "$VOICE_APP"

log "Ensuring ACM certificates"
API_CERT_ARN="$(ensure_cert "$API_DOMAIN")"
VOICE_CERT_ARN="$(ensure_cert "$VOICE_DOMAIN")"
WEB_CERT_ARN="$(ensure_cert "$ROOT_DOMAIN" "$WWW_DOMAIN")"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/backend-options.json" <<JSON
[
  {"Namespace":"aws:autoscaling:launchconfiguration","OptionName":"IamInstanceProfile","Value":"aws-elasticbeanstalk-ec2-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"ServiceRole","Value":"aws-elasticbeanstalk-service-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"EnvironmentType","Value":"LoadBalanced"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"LoadBalancerType","Value":"application"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"ListenerEnabled","Value":"true"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"Protocol","Value":"HTTPS"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"SSLCertificateArns","Value":"${API_CERT_ARN}"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"StreamLogs","Value":"true"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"RetentionInDays","Value":"30"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NODE_ENV","Value":"production"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"PORT","Value":"8080"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"API_PREFIX","Value":"api/v1"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_REGION","Value":"${AWS_REGION}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"FRONTEND_URL","Value":"https://${ROOT_DOMAIN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_APP_URL","Value":"https://${ROOT_DOMAIN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"CORS_ORIGINS","Value":"https://${ROOT_DOMAIN},https://${WWW_DOMAIN},https://${API_DOMAIN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"DYNAMODB_TABLE_PREFIX","Value":"handycall_dev_"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"S3_BUCKET_RECORDINGS","Value":"${S3_RECORDINGS}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"S3_BUCKET_TRANSCRIPTS","Value":"${S3_TRANSCRIPTS}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"USE_PARAMETER_STORE","Value":"false"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_USERS_POOL_ID","Value":"${USERS_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_USERS_CLIENT_ID","Value":"${USERS_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_USERS_CLIENT_SECRET","Value":"${USERS_CLIENT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_ADMIN_POOL_ID","Value":"${ADMIN_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_ADMIN_CLIENT_ID","Value":"${ADMIN_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_ADMIN_CLIENT_SECRET","Value":"${ADMIN_CLIENT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMER_POOL_ID","Value":"${CUSTOMER_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMER_CLIENT_ID","Value":"${CUSTOMER_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMER_CLIENT_SECRET","Value":"${CUSTOMER_CLIENT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMERS_POOL_ID","Value":"${CUSTOMER_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMERS_CLIENT_ID","Value":"${CUSTOMER_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"AWS_COGNITO_CUSTOMERS_CLIENT_SECRET","Value":"${CUSTOMER_CLIENT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"OPENAI_API_KEY","Value":"${OPENAI_API_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_ACCOUNT_SID","Value":"${TWILIO_ACCOUNT_SID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_AUTH_TOKEN","Value":"${TWILIO_AUTH_TOKEN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_PHONE_NUMBER","Value":"${TWILIO_PHONE_NUMBER}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"HANDYCALL_TOOLS_API_KEY","Value":"${TOOLS_API_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"JWT_SECRET","Value":"${JWT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"REFRESH_TOKEN_SECRET","Value":"${REFRESH_TOKEN_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"BOOKING_LINK_SECRET","Value":"${BOOKING_LINK_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"STRIPE_SECRET_KEY","Value":"${STRIPE_SECRET_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"STRIPE_WEBHOOK_SECRET","Value":"${STRIPE_WEBHOOK_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"STRIPE_CONNECT_WEBHOOK_SECRET","Value":"${STRIPE_CONNECT_WEBHOOK_SECRET}"}
]
JSON

cat > "$TMP_DIR/voice-options.json" <<JSON
[
  {"Namespace":"aws:autoscaling:launchconfiguration","OptionName":"IamInstanceProfile","Value":"aws-elasticbeanstalk-ec2-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"ServiceRole","Value":"aws-elasticbeanstalk-service-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"EnvironmentType","Value":"LoadBalanced"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"LoadBalancerType","Value":"application"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"ListenerEnabled","Value":"true"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"Protocol","Value":"HTTPS"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"SSLCertificateArns","Value":"${VOICE_CERT_ARN}"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"StreamLogs","Value":"true"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"RetentionInDays","Value":"30"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NODE_ENV","Value":"production"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"PORT","Value":"8080"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"PUBLIC_BASE_URL","Value":"https://${VOICE_DOMAIN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TOOLS_API_BASE_URL","Value":"https://${API_DOMAIN}/api/v1"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TOOLS_API_KEY","Value":"${TOOLS_API_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"HANDYCALL_TOOLS_API_KEY","Value":"${TOOLS_API_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_VALIDATE_SIGNATURE","Value":"true"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_STREAM_TRACK","Value":"inbound_track"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_ACCOUNT_SID","Value":"${TWILIO_ACCOUNT_SID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"TWILIO_AUTH_TOKEN","Value":"${TWILIO_AUTH_TOKEN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"OPENAI_API_KEY","Value":"${OPENAI_API_KEY}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"OPENAI_REALTIME_MODEL","Value":"gpt-realtime-mini"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"OPENAI_REALTIME_VOICE","Value":"alloy"}
]
JSON

cat > "$TMP_DIR/web-options.json" <<JSON
[
  {"Namespace":"aws:autoscaling:launchconfiguration","OptionName":"IamInstanceProfile","Value":"aws-elasticbeanstalk-ec2-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"ServiceRole","Value":"aws-elasticbeanstalk-service-role"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"EnvironmentType","Value":"LoadBalanced"},
  {"Namespace":"aws:elasticbeanstalk:environment","OptionName":"LoadBalancerType","Value":"application"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"ListenerEnabled","Value":"true"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"Protocol","Value":"HTTPS"},
  {"Namespace":"aws:elbv2:listener:443","OptionName":"SSLCertificateArns","Value":"${WEB_CERT_ARN}"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"StreamLogs","Value":"true"},
  {"Namespace":"aws:elasticbeanstalk:cloudwatch:logs","OptionName":"RetentionInDays","Value":"30"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NODE_ENV","Value":"production"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"PORT","Value":"3001"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_API_URL","Value":"https://${API_DOMAIN}/api/v1"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXTAUTH_URL","Value":"https://${ROOT_DOMAIN}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXTAUTH_SECRET","Value":"${NEXTAUTH_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_REGION","Value":"${AWS_REGION}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_USER_POOL_ID","Value":"${USERS_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_CLIENT_ID","Value":"${USERS_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_CLIENT_SECRET","Value":"${USERS_CLIENT_SECRET}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_ISSUER","Value":"https://cognito-idp.${AWS_REGION}.amazonaws.com/${USERS_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"COGNITO_AUTH_DOMAIN","Value":"handycall"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_COGNITO_AUTH_DOMAIN","Value":"handycall"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_COGNITO_REGION","Value":"${AWS_REGION}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_COGNITO_USER_POOL_ID","Value":"${USERS_POOL_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_COGNITO_CLIENT_ID","Value":"${USERS_CLIENT_ID}"},
  {"Namespace":"aws:elasticbeanstalk:application:environment","OptionName":"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY","Value":"${STRIPE_PUBLISHABLE_KEY}"}
]
JSON

log "Creating EB envs if missing"
create_env_if_missing "$BACKEND_APP" "$BACKEND_ENV" "$API_CERT_ARN" "$TMP_DIR/backend-options.json"
create_env_if_missing "$VOICE_APP" "$VOICE_ENV" "$VOICE_CERT_ARN" "$TMP_DIR/voice-options.json"
create_env_if_missing "$WEB_APP" "$WEB_ENV" "$WEB_CERT_ARN" "$TMP_DIR/web-options.json"

wait_env_ready "$BACKEND_APP" "$BACKEND_ENV"
wait_env_ready "$VOICE_APP" "$VOICE_ENV"
wait_env_ready "$WEB_APP" "$WEB_ENV"

log "Updating environment options"
set_env_options "$BACKEND_APP" "$BACKEND_ENV" "$TMP_DIR/backend-options.json"
set_env_options "$VOICE_APP" "$VOICE_ENV" "$TMP_DIR/voice-options.json"
set_env_options "$WEB_APP" "$WEB_ENV" "$TMP_DIR/web-options.json"

log "Setting core SSM parameters"
put_ssm_secret "/handycall/prod/openai_api_key" "$OPENAI_API_KEY"
put_ssm_secret "/handycall/prod/twilio_auth_token" "$TWILIO_AUTH_TOKEN"
put_ssm_secret "/handycall/prod/twilio_account_sid" "$TWILIO_ACCOUNT_SID"
put_ssm_secret "/handycall/api/openai-key" "$OPENAI_API_KEY"

log "Deploying backend"
bash "$REPO_ROOT/packages/backend/deploy.sh"
wait_env_green "$BACKEND_APP" "$BACKEND_ENV"
BACKEND_CNAME="$(get_env_cname "$BACKEND_APP" "$BACKEND_ENV")"
health_check "http://${BACKEND_CNAME}/api/v1/health" || fail "Backend health check failed"

log "Deploying voice bridge"
bash "$REPO_ROOT/packages/voice-bridge/deploy-docker-eb.sh"
wait_env_green "$VOICE_APP" "$VOICE_ENV"
VOICE_CNAME="$(get_env_cname "$VOICE_APP" "$VOICE_ENV")"
health_check "http://${VOICE_CNAME}/health" || fail "Voice health check failed"

log "Deploying web"
bash "$REPO_ROOT/packages/web/deploy-docker-eb.sh"
wait_env_green "$WEB_APP" "$WEB_ENV"
WEB_CNAME="$(get_env_cname "$WEB_APP" "$WEB_ENV")"
health_check "http://${WEB_CNAME}" || fail "Web health check failed"

IFS='|' read -r API_LB_DNS API_LB_ZONE API_LB_DIM <<< "$(get_env_lb_details "$BACKEND_ENV")"
IFS='|' read -r VOICE_LB_DNS VOICE_LB_ZONE VOICE_LB_DIM <<< "$(get_env_lb_details "$VOICE_ENV")"
IFS='|' read -r WEB_LB_DNS WEB_LB_ZONE WEB_LB_DIM <<< "$(get_env_lb_details "$WEB_ENV")"

log "Updating Route53 aliases"
upsert_dns_aliases "$API_LB_DNS" "$API_LB_ZONE" "$VOICE_LB_DNS" "$VOICE_LB_ZONE" "$WEB_LB_DNS" "$WEB_LB_ZONE"

log "Applying CloudWatch retention and alarms"
apply_log_retention "$BACKEND_ENV" 30
apply_log_retention "$VOICE_ENV" 30
apply_log_retention "$WEB_ENV" 30
put_alarms api "$API_LB_DIM"
put_alarms voice "$VOICE_LB_DIM"
put_alarms web "$WEB_LB_DIM"
put_eb_health_alarm "$BACKEND_APP" "$BACKEND_ENV"
put_eb_health_alarm "$VOICE_APP" "$VOICE_ENV"
put_eb_health_alarm "$WEB_APP" "$WEB_ENV"

if [[ -n "$TWILIO_ACCOUNT_SID" && -n "$TWILIO_AUTH_TOKEN" ]]; then
  log "Updating Twilio webhook for ${TEST_NUMBER_E164}"
  PHONE_RESPONSE="$(curl -fsS -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PhoneNumber=%2B${TEST_NUMBER_E164#+}")"
  PHONE_SID="$(echo "$PHONE_RESPONSE" | jq -r '.incoming_phone_numbers[0].sid // empty')"
  if [[ -n "$PHONE_SID" ]]; then
    curl -fsS -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
      -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${PHONE_SID}.json" \
      --data-urlencode "VoiceUrl=https://${VOICE_DOMAIN}/twilio/voice" \
      --data-urlencode "VoiceMethod=POST" >/dev/null

    TWILIO_READBACK="$(curl -fsS -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${PHONE_SID}.json")"
    CURRENT_URL="$(echo "$TWILIO_READBACK" | jq -r '.voice_url')"
    [[ "$CURRENT_URL" == "https://${VOICE_DOMAIN}/twilio/voice" ]] || fail "Twilio webhook readback mismatch: $CURRENT_URL"
  else
    fail "Twilio number ${TEST_NUMBER_E164} not found"
  fi
fi

log "Verification checks"
for d in "$ROOT_DOMAIN" "$WWW_DOMAIN" "$API_DOMAIN" "$VOICE_DOMAIN"; do
  host "$d" | head -n 1
  aws route53 test-dns-answer --hosted-zone-id "$HOSTED_ZONE_ID" --record-name "$d" --record-type A --region "$AWS_REGION" --query 'RecordData' --output text || true
done

curl -fsS "https://${API_DOMAIN}/api/v1/health" >/dev/null
curl -fsS "https://${VOICE_DOMAIN}/health" >/dev/null
curl -fsS "https://${ROOT_DOMAIN}" >/dev/null

log "Cloud recovery complete"
