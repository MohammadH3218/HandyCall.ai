#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="${VOICE_EB_APP_NAME:-handycall-voice-bridge}"
ENV_NAME="${VOICE_EB_ENV_NAME:-handycall-voice-bridge-alb}"
DOMAIN_NAME="${VOICE_DOMAIN_NAME:-voice.handycall.org}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-Z002814819T09BLDX47MG}"
PLATFORM_ARN="${VOICE_EB_PLATFORM_ARN:-arn:aws:elasticbeanstalk:us-east-1::platform/Docker running on 64bit Amazon Linux 2023/4.9.0}"

aws elasticbeanstalk describe-applications --region "$AWS_REGION" --query "Applications[?ApplicationName=='${APP_NAME}'].ApplicationName" --output text | grep -q "${APP_NAME}" || \
  aws elasticbeanstalk create-application --application-name "${APP_NAME}" --region "$AWS_REGION" >/dev/null

EXISTING_STATUS="$(aws elasticbeanstalk describe-environments --application-name "${APP_NAME}" --environment-names "${ENV_NAME}" --include-deleted --region "$AWS_REGION" --query 'Environments[0].Status' --output text 2>/dev/null || true)"
if [[ -n "${EXISTING_STATUS}" && "${EXISTING_STATUS}" != "None" && "${EXISTING_STATUS}" != "Terminated" ]]; then
  echo "Environment ${ENV_NAME} already exists (${EXISTING_STATUS})"
  exit 0
fi

CERT_ARN="$(aws acm list-certificates --region "$AWS_REGION" --query "CertificateSummaryList[?DomainName=='${DOMAIN_NAME}'].CertificateArn | [0]" --output text)"
if [[ -z "${CERT_ARN}" || "${CERT_ARN}" == "None" ]]; then
  CERT_ARN="$(aws acm request-certificate --domain-name "${DOMAIN_NAME}" --validation-method DNS --region "$AWS_REGION" --query CertificateArn --output text)"
  sleep 2
  VALIDATION_JSON="$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$AWS_REGION" --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json)"
  TMP_CHANGE="$(mktemp)"
  jq -n --argjson records "$VALIDATION_JSON" '{Comment:"ACM validation",Changes:($records|map({Action:"UPSERT",ResourceRecordSet:{Name:.Name,Type:.Type,TTL:300,ResourceRecords:[{Value:.Value}]}}))}' > "$TMP_CHANGE"
  aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "file://$TMP_CHANGE" >/dev/null
  rm -f "$TMP_CHANGE"
  aws acm wait certificate-validated --certificate-arn "$CERT_ARN" --region "$AWS_REGION"
fi

aws elasticbeanstalk create-environment \
  --application-name "$APP_NAME" \
  --environment-name "$ENV_NAME" \
  --platform-arn "$PLATFORM_ARN" \
  --option-settings \
    "Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role" \
    "Namespace=aws:elasticbeanstalk:environment,OptionName=ServiceRole,Value=aws-elasticbeanstalk-service-role" \
    "Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=LoadBalanced" \
    "Namespace=aws:elasticbeanstalk:environment,OptionName=LoadBalancerType,Value=application" \
    "Namespace=aws:elbv2:listener:443,OptionName=ListenerEnabled,Value=true" \
    "Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS" \
    "Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value=${CERT_ARN}" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PUBLIC_BASE_URL,Value=https://${DOMAIN_NAME}" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=TWILIO_VALIDATE_SIGNATURE,Value=true" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=TWILIO_STREAM_TRACK,Value=inbound_track" \
  --region "$AWS_REGION" >/dev/null

echo "Environment creation started for ${APP_NAME}/${ENV_NAME}"
