# HandyCall - Quick Reference Card

## 🚀 Quick Start (After Manual Setup)

### 1. Register Your Company
```bash
aws dynamodb put-item --table-name handycall_prod_companies --item '{
  "company_id": {"S": "YOUR_COMPANY_ID"},
  "company_name": {"S": "Your Company Name"},
  "phone_number": {"S": "+1YOUR_CONNECT_NUMBER"},
  "status": {"S": "ACTIVE"},
  "created_at": {"N": "'$(date +%s%3N)'"},
  "updated_at": {"N": "'$(date +%s%3N)'"}
}'
```

### 2. Start Backend
```bash
cd packages/backend
npm run start:dev
```

### 3. Add Knowledge via API
```bash
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Business Hours",
    "content": "Monday-Friday 9AM-5PM",
    "type": "FAQ"
  }'
```

---

## 📊 Key AWS Resources

| Resource | Value |
|----------|-------|
| **Connect Instance ID** | `e55edc1b-5259-45ce-bb2c-1b3248c6031b` |
| **Call Orchestrator** | `arn:aws:lambda:us-east-1:982081079378:function:handycall-call-orchestrator` |
| **Post-Call Processor** | `arn:aws:lambda:us-east-1:982081079378:function:handycall-post-call-processor` |
| **Recordings S3** | `s3://handycall-recordings-prod` |
| **Transcripts S3** | `s3://handycall-transcripts-prod` |
| **DynamoDB Prefix** | `handycall_prod_` |
| **Region** | `us-east-1` |
| **Account** | `982081079378` |

---

## 🔍 Monitoring Commands

### Watch Lambda Logs (Real-time)
```bash
# Call orchestrator (during live calls)
aws logs tail /aws/lambda/handycall-call-orchestrator --follow

# Post-call processor (after calls end)
aws logs tail /aws/lambda/handycall-post-call-processor --follow
```

### View Recent Calls
```bash
aws dynamodb scan --table-name handycall_prod_calls \
  --max-items 5 \
  --query 'Items[*].[company_id.S,call_id.S,status.S,summary.S]' \
  --output table
```

### View Flagged Questions
```bash
aws dynamodb scan --table-name handycall_prod_flagged_questions \
  --filter-expression "status = :status" \
  --expression-attribute-values '{":status":{"S":"OPEN"}}' \
  --query 'Items[*].[question.S,ai_attempted_answer.S,confidence_score.N]' \
  --output table
```

### View Knowledge Items
```bash
aws dynamodb scan --table-name handycall_prod_knowledge_items \
  --max-items 10 \
  --query 'Items[*].[title.S,type.S,status.S]' \
  --output table
```

### List Recent Transcripts
```bash
aws s3 ls s3://handycall-transcripts-prod/transcripts/ --recursive | tail -10
```

### Download Transcript
```bash
# Replace with actual company_id and call_id
aws s3 cp s3://handycall-transcripts-prod/transcripts/{company_id}/{call_id}.json ./
cat {call_id}.json | jq .
```

---

## 🛠️ Troubleshooting

### Check Lambda Function Status
```bash
aws lambda get-function --function-name handycall-call-orchestrator \
  --query 'Configuration.[State,LastUpdateStatus]'
```

### View Lambda Errors (Last Hour)
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/handycall-call-orchestrator \
  --start-time $(($(date +%s) - 3600))000 \
  --filter-pattern "ERROR"
```

### Test Lambda Manually
```bash
aws lambda invoke \
  --function-name handycall-call-orchestrator \
  --payload '{"Details":{"ContactData":{"ContactId":"test-123","CustomerEndpoint":{"Address":"+15551234567"},"SystemEndpoint":{"Address":"+18005551234"}},"Parameters":{"UserInput":"What are your hours?"}}}' \
  response.json
cat response.json | jq .
```

### Verify DynamoDB Tables
```bash
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `handycall_prod_`)]'
```

### Check S3 Bucket Notification
```bash
aws s3api get-bucket-notification-configuration \
  --bucket handycall-recordings-prod
```

---

## 🔧 Common Operations

### Update Lambda Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name handycall-call-orchestrator \
  --environment "Variables={DYNAMODB_TABLE_PREFIX=handycall_prod_,BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0}"
```

### Redeploy Lambda After Code Changes
```bash
# Call orchestrator
cd packages/lambda/call-orchestrator
npm run build
powershell -Command "Compress-Archive -Path dist,node_modules -DestinationPath orchestrator.zip -Force"
aws lambda update-function-code \
  --function-name handycall-call-orchestrator \
  --zip-file fileb://orchestrator.zip
```

### View Connect Instance Details
```bash
aws connect describe-instance --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b
```

### List Contact Flows
```bash
aws connect list-contact-flows --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b
```

---

## 📈 Performance Metrics

### Lambda Invocation Count (Last 24 Hours)
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=handycall-call-orchestrator \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

### Lambda Error Rate
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=handycall-call-orchestrator \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🎯 Key Phone Numbers for Testing

| Type | Number | Purpose |
|------|--------|---------|
| Connect Number | *(Claim via Console)* | Your main business line |
| Test Customer | Your mobile phone | Call to test AI responses |

---

## 📚 Important Files

| File | Purpose |
|------|---------|
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Complete overview of what's been built |
| [CONNECT_SETUP.md](CONNECT_SETUP.md) | Manual setup instructions |
| [connect-contact-flow.json](connect-contact-flow.json) | Contact flow template to import |
| [packages/backend/.env](packages/backend/.env) | Backend configuration |
| [packages/lambda/call-orchestrator/src/index.ts](packages/lambda/call-orchestrator/src/index.ts) | Real-time call handler |
| [packages/lambda/post-call-processor/src/index.ts](packages/lambda/post-call-processor/src/index.ts) | Post-call processing |

---

## 🆘 Emergency Commands

### Roll Back Lambda Deployment
```bash
# List versions
aws lambda list-versions-by-function --function-name handycall-call-orchestrator

# Roll back to specific version
aws lambda update-function-configuration \
  --function-name handycall-call-orchestrator \
  --publish \
  --revision-id PREVIOUS_REVISION_ID
```

### Disable S3 Trigger
```bash
aws s3api put-bucket-notification-configuration \
  --bucket handycall-recordings-prod \
  --notification-configuration '{}'
```

### Delete All Flagged Questions (Clean Slate)
```bash
# Use with caution!
aws dynamodb scan --table-name handycall_prod_flagged_questions \
  --query 'Items[*].[company_id.S,flagged_id.S]' \
  --output json | jq -r '.[] | @tsv' | while read company_id flagged_id; do
    aws dynamodb delete-item \
      --table-name handycall_prod_flagged_questions \
      --key "{\"company_id\":{\"S\":\"$company_id\"},\"flagged_id\":{\"S\":\"$flagged_id\"}}"
done
```

---

## 💰 Cost Monitoring

### Estimate Monthly Costs (Typical Usage)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Bedrock Claude Sonnet | 10K requests, 3M tokens | ~$24 |
| Bedrock Haiku | 10K requests, 500K tokens | ~$1 |
| Titan Embeddings | 50K requests | ~$0.50 |
| Lambda | 10K invocations, 512MB | ~$2 |
| Transcribe | 1000 minutes | ~$24 |
| DynamoDB | 100K reads, 50K writes | ~$1 |
| S3 | 100GB storage, 10K requests | ~$2.50 |
| Connect | 1000 minutes | ~$20 |
| **TOTAL** | | **~$75/month** |

*Based on 1000 calls/month, 1 min avg duration*

---

## 🔐 Security Checklist

- [ ] Rotate JWT secrets in production
- [ ] Enable MFA for AWS root account
- [ ] Configure IAM password policy
- [ ] Enable CloudTrail logging
- [ ] Set up AWS Config rules
- [ ] Enable GuardDuty
- [ ] Configure VPC for Lambda (optional)
- [ ] Enable S3 bucket versioning
- [ ] Set up DynamoDB backups

---

## 📞 Support

**Documentation:**
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What's been built
- [CONNECT_SETUP.md](CONNECT_SETUP.md) - Manual setup guide
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [Amazon Connect Docs](https://docs.aws.amazon.com/connect/)
- [Bedrock Docs](https://docs.aws.amazon.com/bedrock/)

**Status**: ✅ Phases 1-4 Complete | Next: Claim phone number + test
