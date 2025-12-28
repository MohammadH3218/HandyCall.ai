# Complete HandyCall Amazon Connect Setup

## Current Status ✅

- ✅ Phone number claimed: **+16057052030**
- ✅ Company registered in DynamoDB: **test-handycall-001**
- ✅ Agent configuration created
- ✅ Knowledge items added (Business Hours, Services, Contact Info)
- ⚠️ Contact flow needs to be created/imported
- ⚠️ Phone number needs to be associated with contact flow

## Quick Setup (5 minutes)

### Option 1: Console Import (Easiest)

1. **Import Contact Flow via Console:**
   - Go to: https://console.aws.amazon.com/connect/
   - Select instance: `e55edc1b-5259-45ce-bb2c-1b3248c6031b`
   - Navigate to: **Routing** → **Contact flows**
   - Click **Create contact flow**
   - Click dropdown (⌄) next to **Save** → **Import flow (beta)**
   - Import file: `handycall-flow-final.json`
   - Click **Save** then **Publish**

2. **Associate Phone Number:**
   - Go to: **Channels** → **Phone numbers**
   - Click on: **+16057052030**
   - Under **Contact flow / IVR**, select: **HandyCall AI Inbound**
   - Click **Save**

### Option 2: CLI Setup (After Console Import)

After importing the flow via console, run:

```powershell
# Get the contact flow ID
$FLOW_ID = aws connect list-contact-flows `
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b `
  --query 'ContactFlowSummaryList[?Name==`HandyCall AI Inbound`].Id' `
  --output text

# Associate phone number (if API supports it)
aws connect update-phone-number `
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 `
  --target-arn "arn:aws:connect:us-east-1:982081079378:instance/e55edc1b-5259-45ce-bb2c-1b3248c6031b/contact-flow/$FLOW_ID"
```

**Note:** Phone number association via CLI may require Console - use Option 1 if CLI doesn't work.

## Verify Setup

```powershell
# Check company
aws dynamodb get-item `
  --table-name handycall_prod_companies `
  --key '{"company_id":{"S":"test-handycall-001"}}' `
  --query 'Item.[company_name.S,phone_number.S,status.S]' `
  --output table

# Check knowledge items
aws dynamodb scan `
  --table-name handycall_prod_knowledge_items `
  --filter-expression "company_id = :c" `
  --expression-attribute-values '{\":c\":{\"S\":\"test-handycall-001\"}}' `
  --query 'Items[*].[title.S,type.S]' `
  --output table
```

## Test Your Setup

1. Call **+16057052030** from your phone
2. You should hear the AI greeting
3. Monitor logs:

```powershell
aws logs tail /aws/lambda/handycall-call-orchestrator --follow
```

## Current Configuration

| Item | Value |
|------|-------|
| Phone Number | +16057052030 |
| Phone ID | 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 |
| Company ID | test-handycall-001 |
| Lambda Function | handycall-call-orchestrator |
| Instance ID | e55edc1b-5259-45ce-bb2c-1b3248c6031b |

## Next Steps After Basic Flow Works

1. **Add Conversation Loop:**
   - Edit the contact flow in Console
   - Add "Get customer input" block after AI response
   - Store input in UserInput attribute
   - Loop back to Lambda invocation

2. **Enable Speech Input:**
   - Change "Get customer input" to use speech recognition
   - Enable Amazon Transcribe

3. **Add Call Recording:**
   - Add "Set recording behavior" block
   - Enable recording for analytics

## Troubleshooting

### Lambda not receiving calls
- Check Lambda has Connect invoke permission
- Verify contact flow is published (not just saved)
- Check CloudWatch logs for errors

### Company not found
- Verify phone number in DynamoDB matches exactly: `+16057052030`
- Check GSI2 index exists on companies table

### No AI response
- Check Lambda logs: `/aws/lambda/handycall-call-orchestrator`
- Verify Bedrock access and model ID
- Check agent config exists for company

