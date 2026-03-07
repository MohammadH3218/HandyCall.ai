# Cloud Recovery Runbook (AWS)

Last updated: 2026-03-07

## Branch Strategy

- Local-only development: use non-master branches (for example `deploy/local-sync-*`).
- Cloud/production deployments: cut from `origin/master` into a dedicated recovery/release branch (for example `cloud/recovery-YYYYMMDD`).
- Do not deploy directly from local experimental branches.

## Target Architecture

- Region/account: `us-east-1` / `982081079378`
- Elastic Beanstalk apps/environments:
  - `handycall-api` / `handycall-api-lb`
  - `handycall-voice-bridge` / `handycall-voice-bridge-alb`
  - `handycall-web` / `handycall-web-lb`
- ECR repositories:
  - `handycall-backend`
  - `handycall-voice-bridge`
  - `handycall-web`
- DNS:
  - `api.handycall.org` -> backend ALB
  - `voice.handycall.org` -> voice ALB
  - `handycall.org`, `www.handycall.org` -> web ALB
- Data stores:
  - DynamoDB prefix: `handycall_dev_` (core-first recovery)
  - S3 buckets:
    - `handycall-recordings-dev-982081079378`
    - `handycall-transcripts-dev-982081079378`

## Core Runtime Configuration

- Backend:
  - `DYNAMODB_TABLE_PREFIX=handycall_dev_`
  - `USE_PARAMETER_STORE=false`
  - `S3_BUCKET_RECORDINGS=handycall-recordings-dev-982081079378`
  - `S3_BUCKET_TRANSCRIPTS=handycall-transcripts-dev-982081079378`
  - Cognito users/admin/customer IDs and client IDs from live AWS resources
- Voice bridge:
  - `PUBLIC_BASE_URL=https://voice.handycall.org`
  - `TOOLS_API_BASE_URL=https://api.handycall.org/api/v1`
  - `TWILIO_VALIDATE_SIGNATURE=true`
  - `TWILIO_STREAM_TRACK=inbound_track`
- Web:
  - `NEXT_PUBLIC_API_URL=https://api.handycall.org/api/v1`
  - `NEXTAUTH_URL=https://handycall.org`
  - Cognito values aligned to active `handycall` user pool/domain

## Parameter Store Baseline

- `/handycall/prod/openai_api_key`
- `/handycall/prod/twilio_auth_token`
- `/handycall/prod/twilio_account_sid`
- `/handycall/api/openai-key`

Phase-2 only (deferred):
- `/handycall/oauth/*`
- `/handycall/apns/*`

## Deploy Commands

```bash
# from repo root
bash scripts/aws/cloud-recovery-core.sh
```

Service-only deploys:

```bash
bash packages/backend/deploy.sh
bash packages/voice-bridge/deploy-docker-eb.sh
bash packages/web/deploy-docker-eb.sh
```

## Verification Checklist

```bash
# DNS
host handycall.org
host www.handycall.org
host api.handycall.org
host voice.handycall.org

# Health
curl -fsS https://api.handycall.org/api/v1/health
curl -fsS https://voice.handycall.org/health
curl -I https://handycall.org
```

Twilio readback should show:
- `VoiceUrl=https://voice.handycall.org/twilio/voice`
- `VoiceMethod=POST`

## Rollback

1. Re-deploy previous known-good EB application versions per service:

```bash
aws elasticbeanstalk update-environment --application-name handycall-api --environment-name handycall-api-lb --version-label <previous-version>
aws elasticbeanstalk update-environment --application-name handycall-voice-bridge --environment-name handycall-voice-bridge-alb --version-label <previous-version>
aws elasticbeanstalk update-environment --application-name handycall-web --environment-name handycall-web-lb --version-label <previous-version>
```

2. Re-UPSERT Route53 aliases back to previous ALB targets if needed.
3. Keep Twilio webhook pinned to the active voice endpoint.

## Monitoring

- Keep existing CloudTrail `JobSpyTrail` (no duplicate trail creation).
- CloudWatch:
  - EB log streaming + retention
  - ALB 5XX alarms (api/web/voice)
  - EB environment health alarms
