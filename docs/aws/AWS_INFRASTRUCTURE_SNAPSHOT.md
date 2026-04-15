# HandyCall AWS Infrastructure Snapshot
**Account:** 982081079378
**Region:** us-east-1
**Snapshot Date:** 2026-04-07
**Reason:** Full teardown to stop billing. Preserve this file to rebuild.

---

## 1. Elastic Beanstalk

### Applications & Environments

| App Name | Environment | Status | Health | Instance Type | Min | Max | URL |
|----------|-------------|--------|--------|---------------|-----|-----|-----|
| `handycall-api` | `handycall-api-lb` | Ready | Green | t3.micro | 1 | 4 | handycall-api-lb.eba-utmfjzhj.us-east-1.elasticbeanstalk.com |
| `handycall-web` | `handycall-web-lb` | Ready | Green | t3.micro | 1 | 4 | handycall-web-lb.eba-fb3u3j5j.us-east-1.elasticbeanstalk.com |
| `handycall-voice-bridge` | `handycall-voice-bridge-alb` | Ready | Red | t3.medium | 2 | 4 | handycall-voice-bridge-alb.eba-tumka9bp.us-east-1.elasticbeanstalk.com |

### DNS Aliases (Route 53 → ELB)
- `handycall.org` / `www.handycall.org` → `awseb--awseb-iosstvhqz7mk-771957375.us-east-1.elb.amazonaws.com`
- `api.handycall.org` → `awseb--awseb-srgafpz9gvry-8797948.us-east-1.elb.amazonaws.com`
- `voice.handycall.org` → `awseb--awseb-ygnjhk9a2hzw-1124145639.us-east-1.elb.amazonaws.com`

---

## 2. ECR (Elastic Container Registry)

| Repository | URI | Images |
|------------|-----|--------|
| `handycall-backend` | `982081079378.dkr.ecr.us-east-1.amazonaws.com/handycall-backend` | Many tagged builds (latest = 2026-04-01) |
| `handycall-web` | `982081079378.dkr.ecr.us-east-1.amazonaws.com/handycall-web` | Many tagged builds (latest = 2026-04-01) |
| `handycall-voice-bridge` | `982081079378.dkr.ecr.us-east-1.amazonaws.com/handycall-voice-bridge` | 1 image (2026-03-21) |

### Image Tag Format
- Backend: `YYYYMMDD-HHMMSS-amd64` (e.g. `20260401-210042-amd64`)
- Web: `web-outbound-YYYYMMDD-HHMMSS-amd64`
- Voice bridge: `YYYYMMDD-voicebridge-amd64-bargein`

---

## 3. Cognito User Pools

### Pool 1 — Users Pool (Pro accounts + Google OAuth)
| Field | Value |
|-------|-------|
| Pool ID | `us-east-1_gBsGtRPnM` |
| Pool Name | `handycall-dev-users-pool` |
| Client ID | `3vhh0artoakoardoi4e9rdm3m9` |
| Client Name | `handycall-dev-users-client` |
| MFA | OFF |
| Identity Providers | Google |
| Users | 2 |
| Custom Attributes | `custom:company_name`, `custom:role`, `custom:company_id` |

**Users in this pool:**
| Username | Email | Status | Created |
|----------|-------|--------|---------|
| `a458c468-2081-7049-5987-3aceaafbea40` | toushe3219@gmail.com | CONFIRMED | 2026-03-29 |
| `Google_108106304384968658678` | fortnitegamerlol5436@gmail.com | EXTERNAL_PROVIDER | 2026-04-01 |

### Pool 2 — Customer Pool (Customer accounts)
| Field | Value |
|-------|-------|
| Pool ID | `us-east-1_v08KHH5np` |
| Pool Name | `handycall-customers-20260227-024321` |
| Client ID | `3u3ktbcsqlb31uosk4cirvl678` |
| Client Name | `handycall-customers-app` |
| MFA | OFF |
| Users | 3 |

**Users in this pool:**
| Username | Email | Status | Created |
|----------|-------|--------|---------|
| `a4f8a498-a051-70e8-aae7-1daa92769f6a` | manacubebans@gmail.com | CONFIRMED | 2026-03-28 |
| `b488b478-1001-70e2-d6c5-5314680f4582` | mohammadh3218@gmail.com | CONFIRMED | 2026-04-01 |
| `e4c8e408-9061-70b5-92c2-5332bae84150` | toushe5436@gmail.com | CONFIRMED | 2026-03-28 |

### Pool 3 — Admin Pool
| Field | Value |
|-------|-------|
| Pool ID | `us-east-1_87I5bQxUW` |
| Pool Name | `handycall-dev-admin-pool` |
| Users | 0 |
| MFA | OFF |

### Pool 4 — Legacy / Unused
| Field | Value |
|-------|-------|
| Pool ID | `us-east-1_kpXZ426n8` |
| Pool Name | `User pool - 5dvkdb` |
| Note | Likely EncryptGate-era pool, appears unused for HandyCall |

---

## 4. DynamoDB Tables

All tables use `handycall_dev_` prefix. Region: us-east-1.

### HandyCall Tables (all `handycall_dev_*`)

| Table Name | Item Count (at snapshot) |
|------------|--------------------------|
| `handycall_dev_agent_configs` | — |
| `handycall_dev_appointments` | 0 |
| `handycall_dev_call_highlights` | — |
| `handycall_dev_calls` | 0 |
| `handycall_dev_chat_sessions` | — |
| `handycall_dev_companies` | **2** |
| `handycall_dev_company_numbers` | — |
| `handycall_dev_connected_accounts` | — |
| `handycall_dev_contacts` | 1 |
| `handycall_dev_customer_payments` | — |
| `handycall_dev_customer_profiles` | 1 |
| `handycall_dev_deleted_accounts` | — |
| `handycall_dev_flagged_questions` | — |
| `handycall_dev_follow_up_sequences` | — |
| `handycall_dev_invoices` | — |
| `handycall_dev_knowledge_chunks` | — |
| `handycall_dev_knowledge_items` | 0 |
| `handycall_dev_login_otp_sessions` | — |
| `handycall_dev_notification_devices` | — |
| `handycall_dev_notification_preferences` | — |
| `handycall_dev_notification_usage_alerts` | — |
| `handycall_dev_notifications` | — |
| `handycall_dev_outbound_calls` | — |
| `handycall_dev_phone_verification_codes` | — |
| `handycall_dev_portal_messages` | — |
| `handycall_dev_pricing_rules` | — |
| `handycall_dev_quote_requests` | 1 |
| `handycall_dev_realtime_cache` | — |
| `handycall_dev_reviews` | — |
| `handycall_dev_scheduled_messages` | — |
| `handycall_dev_service_products` | — |
| `handycall_dev_service_templates` | — |
| `handycall_dev_sms` | — |
| `handycall_dev_sms_templates` | — |
| `handycall_dev_team_members` | — |
| `handycall_dev_usage_metrics` | — |
| `handycall_dev_users` | **2** |
| `handycall_dev_webhook_configs` | — |

### Company Records (from `handycall_dev_companies`)
```json
{ "company_id": "df1717a7-7350-4d99-8118-8fa5bdb4dcc8", "email": "toushe3219@gmail.com", "created_at": "1774807310248" }
{ "company_id": "86973106-32e0-4842-b304-851900b790ac", "email": "fortnitegamerlol5436@gmail.com", "created_at": "1774997505674" }
```

### Non-HandyCall DynamoDB Tables (EncryptGate-era, leave alone)
`BlockList`, `CloudServices`, `Detections`, `Emails`, `Employees`, `Investigations`, `Organizations`, `PushedRequests`, `SecurityRoles`, `SecurityTeamUsers`, `SecurityUserRoles`, `UserInvitations`, `Users`, `VirusTotal_DomainCache`, `VirusTotal_FileCache`, `VirusTotal_URLCache`

---

## 5. S3 Buckets

| Bucket | Created | Notes |
|--------|---------|-------|
| `cf-templates-1r7oe7wttglh1-us-east-1` | 2025-01-30 | CloudFormation templates (EB managed) |
| `elasticbeanstalk-us-east-1-982081079378` | 2025-03-01 | EB deployment artifacts |
| `elasticbeanstalk-us-west-2-982081079378` | 2025-03-01 | EB deployment artifacts (us-west-2) |
| `handycall-cloudtrail-logs-982081079378-us-east-1` | 2026-03-07 | CloudTrail audit logs |
| `handycall-recordings-dev-982081079378` | 2026-03-01 | **Call recordings** |
| `handycall-transcripts-dev-982081079378` | 2026-03-01 | **Call transcripts** |
| `mohammadh-bucket` | 2025-01-30 | General purpose / misc |
| `ses-inbound-encryptgate` | 2025-08-17 | SES inbound email (EncryptGate) |

---

## 6. CloudFront Distributions

| ID | Domain | Aliases | Status | Origin |
|----|--------|---------|--------|--------|
| `EBN5YSQAJKET1` | d3olauzl2lk8w3.cloudfront.net | none | Deployed | encryptgateconsolebackend-env (EncryptGate) |
| `ERGHSC3BHIF0E` | d1b4ugsdgvwwy6.cloudfront.net | `api.handycall.org` | Deployed | handycall-api-docker.eba-pmfyttgp (old EB env) |

> Note: `ERGHSC3BHIF0E` points to an old EB env (`handycall-api-docker`) that may no longer exist. The live API route goes directly via Route 53 → ELB.

---

## 7. Route 53

### Hosted Zones

| Zone | ID | Record Count |
|------|----|-------------|
| `handycall.org` | Z002814819T09BLDX47MG | 20 |
| `encryptgate.net` | Z09592251VL0S44JFJXQJ | 2 |
| `console-encryptgate.net` | Z02390652L96U370ZKCAU | 10 |

### handycall.org DNS Records (Full)

| Name | Type | Value |
|------|------|-------|
| `handycall.org` | A (Alias) | awseb--awseb-iosstvhqz7mk-771957375.us-east-1.elb.amazonaws.com |
| `www.handycall.org` | A (Alias) | awseb--awseb-iosstvhqz7mk-771957375.us-east-1.elb.amazonaws.com |
| `api.handycall.org` | A (Alias) | awseb--awseb-srgafpz9gvry-8797948.us-east-1.elb.amazonaws.com |
| `voice.handycall.org` | A (Alias) | awseb--awseb-ygnjhk9a2hzw-1124145639.us-east-1.elb.amazonaws.com |
| `handycall.org` | MX | 10 inbound-smtp.us-east-1.amazonaws.com |
| `handycall.org` | TXT (SPF) | v=spf1 include:amazonses.com include:spf.mail.us-east-1.awsapps.com ~all |
| `_amazonses.handycall.org` | TXT | DTFZU8SmXvktFvUWvmo0NZL1Vmiz9l4P0HCiGcGXl+4= |
| `_dmarc.handycall.org` | TXT | v=DMARC1; p=quarantine; rua=mailto:hello@handycall.org; fo=1; adkim=s; aspf=s |
| `autodiscover.handycall.org` | CNAME | autodiscover.mail.us-east-1.awsapps.com |
| DKIM 1 | CNAME | 2godnqc2ojutlwgoimuza3n462ddl6b6.dkim.amazonses.com |
| DKIM 2 | CNAME | vjkvt3gczsqgpejqquwcwx5cceksvxwr.dkim.amazonses.com |
| DKIM 3 | CNAME | wl3vv45bskv2vjpocadz43lqxmh66vex.dkim.amazonses.com |
| ACM validation CNAMEs | CNAME | (various .acm-validations.aws) |

---

## 8. ACM Certificates

| Domain | Status | ARN |
|--------|--------|-----|
| `handycall.org` | ISSUED | arn:aws:acm:us-east-1:982081079378:certificate/230b9524-a68c-4b55-8547-b14dc3d78dfc |
| `api.handycall.org` | ISSUED | arn:aws:acm:us-east-1:982081079378:certificate/5ec7a007-5440-4d8f-8ba9-db70572eb5f4 |
| `voice.handycall.org` | ISSUED | arn:aws:acm:us-east-1:982081079378:certificate/cb2a3875-7617-408a-8415-d24781439d97 |
| `console-encryptgate.net` | EXPIRED | arn:aws:acm:us-east-1:982081079378:certificate/7d95b40c-fb9f-4478-9766-ee97666ac46e |
| `api.console-encryptgate.net` | ISSUED | arn:aws:acm:us-east-1:982081079378:certificate/469a3ebf-15af-4898-bc6d-e57bb81fb912 |

---

## 9. SES (Simple Email Service)

### Verified Identities
- `handycall.org` (domain)
- `handycall.awsapps.com` (domain — WorkMail)
- `hello@handycall.org`
- `no-contact@handycall.org`
- `toushe3219@gmail.com`

### Sending Quota
- Max 24-hour send: 50,000
- Max send rate: 14/sec
- Sent last 24h: 0

### Receipt Rule Sets
| Name | Created |
|------|---------|
| `INBOUND_MAIL` | 2026-02-05 |
| `EncryptGate-Email-to-S3` | 2025-08-17 |

---

## 10. SNS Topics

| ARN | Purpose |
|-----|---------|
| `arn:aws:sns:us-east-1:982081079378:BillingNotif` | Billing alerts |
| `arn:aws:sns:us-east-1:982081079378:ses-mailmanager-inbound1` | SES inbound mail |

---

## 11. Lambda Functions

| Function | Runtime | Memory | Timeout |
|----------|---------|--------|---------|
| `console-encryptgate-webhook-workmail` | nodejs22.x | 128 MB | 30s |

> Note: This function is EncryptGate-related, not HandyCall. Kept for reference.

---

## 12. CloudWatch Alarms

| Alarm | State | Metric |
|-------|-------|--------|
| `BillingNotif` | OK | EstimatedCharges |
| `handycall-handycall-api-lb-health` | OK | EnvironmentHealth |
| `handycall-handycall-web-lb-health` | OK | EnvironmentHealth |
| `handycall-handycall-voice-bridge-alb-health` | OK | EnvironmentHealth |
| `handycall-api-alb-5xx` | OK | HTTPCode_ELB_5XX_Count |
| `handycall-web-alb-5xx` | OK | HTTPCode_ELB_5XX_Count |
| `handycall-voice-alb-5xx` | OK | HTTPCode_ELB_5XX_Count |
| EB autoscaling alarms (×6) | OK/ALARM | NetworkOut |

---

## 13. Estimated Monthly Cost (at snapshot)

| Service | Approx Cost/Month |
|---------|-------------------|
| EB — API (t3.micro ×1) | ~$10 |
| EB — Web (t3.micro ×1) | ~$10 |
| EB — Voice Bridge (t3.medium ×2 min) | ~$60 |
| 3× Application Load Balancers | ~$50 |
| DynamoDB (on-demand, low traffic) | ~$5 |
| Cognito (< 50K MAU free tier) | $0 |
| ECR storage (~10 GB) | ~$1 |
| S3 (low storage/requests) | ~$1 |
| CloudFront | ~$1 |
| SES | ~$0 (below free tier) |
| Route 53 (3 hosted zones) | ~$2 |
| **Total estimate** | **~$140/month** |

---

## 14. How to Rebuild

### Re-deploy EB environments
```bash
# Backend
cd packages/backend
eb init handycall-api --region us-east-1 --platform docker
eb create handycall-api-lb --instance-type t3.micro --min-instances 1 --max-instances 4

# Web
cd packages/web
eb init handycall-web --region us-east-1 --platform docker
eb create handycall-web-lb --instance-type t3.micro --min-instances 1 --max-instances 4

# Voice bridge
eb init handycall-voice-bridge --region us-east-1 --platform docker
eb create handycall-voice-bridge-alb --instance-type t3.medium --min-instances 2 --max-instances 4
```

### Re-create DynamoDB tables
All table names follow `handycall_dev_<resource>` pattern. Check `packages/backend/src/modules/*/` for table schemas and key definitions.

### ECR images (still exist at teardown)
Latest images are tagged `latest` and preserved in ECR. Pull with:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 982081079378.dkr.ecr.us-east-1.amazonaws.com
docker pull 982081079378.dkr.ecr.us-east-1.amazonaws.com/handycall-backend:latest
docker pull 982081079378.dkr.ecr.us-east-1.amazonaws.com/handycall-web:latest
```

### Cognito pools
**Do NOT delete** — kept active to preserve user accounts and Google OAuth federation config.

### DNS
Update Route 53 A records to point to new EB ELB endpoints after re-deploying.

---

## 15. What Was Deleted (Teardown Log)

- [x] EB environment: `handycall-api-lb` (App: `handycall-api`) — Terminated 2026-04-07
- [x] EB environment: `handycall-web-lb` (App: `handycall-web`) — Terminated 2026-04-07
- [x] EB environment: `handycall-voice-bridge-alb` (App: `handycall-voice-bridge`) — Terminated 2026-04-07
- [x] EB applications: `handycall-api`, `handycall-web`, `handycall-voice-bridge` — Deleted 2026-04-07
- [x] DynamoDB tables: all 38 `handycall_dev_*` tables — Deleted 2026-04-07
- [x] ECR images: all images in all 3 repos cleared — 2026-04-07 (repos kept for future pushes)

### Kept (no ongoing cost or needed for rebuild)
- Cognito user pools (all 4) — no cost below 50K MAU
- Route 53 hosted zones — $0.50/zone/month (trivial)
- ACM certificates — free
- S3 buckets — only pay for stored data
- SES identities — free
- SNS topics — free at rest
- CloudFront distributions — free at rest (pay per request)

---
*Generated by Claude Code — HandyCall project teardown 2026-04-07*
