# Final Setup Steps for HandyCall Amazon Connect

## ✅ What's Already Done

- ✅ Phone number claimed: **+16057052030**
- ✅ Company registered: **test-handycall-001**
- ✅ Agent configuration created
- ✅ 3 knowledge items added
- ✅ Lambda functions deployed and working

## 🎯 What You Need To Do (5 minutes)

### Step 1: Import Contact Flow via Console

**Why Console?** AWS CLI contact flow creation has very strict JSON validation requirements that are difficult to meet programmatically. Console import is the most reliable method.

1. Open Amazon Connect Console:
   - https://console.aws.amazon.com/connect/
   - Select instance: `e55edc1b-5259-45ce-bb2c-1b3248c6031b`

2. Import the contact flow:
   - Go to: **Routing** → **Contact flows**
   - Click **Create contact flow**
   - In the flow designer, click the dropdown (⌄) next to **Save** button (top right)
   - Select **Import flow (beta)**
   - Choose file: `handycall-flow-final.json` (in your project root)
   - Click **Import**
   - Click **Save**
   - Click **Publish** (very important!)

### Step 2: Associate Phone Number with Contact Flow

**Option A: Via Console (Easiest)**
- Go to: **Channels** → **Phone numbers**
- Click on: **+16057052030**
- Under **Contact flow / IVR**, select: **HandyCall AI Inbound**
- Click **Save**

**Option B: Via CLI (After Step 1)**
```powershell
# Get the contact flow ID
$FLOW_ID = aws connect list-contact-flows `
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b `
  --query 'ContactFlowSummaryList[?Name==`HandyCall AI Inbound`].Id' `
  --output text

# Associate phone number
aws connect update-phone-number `
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 `
  --target-arn "arn:aws:connect:us-east-1:982081079378:instance/e55edc1b-5259-45ce-bb2c-1b3248c6031b/contact-flow/$FLOW_ID"
```

## 🧪 Test Your Setup

1. Call **+16057052030** from your phone
2. You should hear: "Hello, thank you for calling HandyCall. I am your AI assistant. How may I help you today?"
3. The call will disconnect after the greeting (basic flow - you can enhance it later)

## 📊 Monitor Logs

Watch Lambda logs in real-time:
```powershell
aws logs tail /aws/lambda/handycall-call-orchestrator --follow
```

## 🔍 Verify Everything is Configured

```powershell
# Check company registration
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

# Check contact flows
aws connect list-contact-flows `
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b `
  --query 'ContactFlowSummaryList[?contains(Name, `HandyCall`) || contains(Name, `handycall`)].[Name,Id]' `
  --output table
```

## 📝 Contact Flow File Location

The contact flow JSON file is at:
- **File**: `handycall-flow-final.json`
- **Location**: `C:\Users\PC\Documents\VSCode Projects\HandyCall\handycall-flow-final.json`

This file contains a minimal working flow that:
- Sets initial UserInput attribute
- Invokes your Lambda function
- Plays the AI response
- Disconnects

## 🚀 Next Steps (After Basic Flow Works)

1. **Add Conversation Loop:**
   - Edit the flow in Console
   - Add "Get customer input" block
   - Store input in UserInput attribute  
   - Loop back to Lambda

2. **Enable Speech Recognition:**
   - Use Amazon Transcribe for speech-to-text
   - Update GetParticipantInput block

3. **Add Call Recording:**
   - Enable recording for analytics
   - Add "Set recording behavior" block

## 🆘 Troubleshooting

### "Flow not found" error
- Make sure you clicked **Publish** after saving (not just Save)
- Check the flow name is exactly "HandyCall AI Inbound"

### Lambda not being called
- Check CloudWatch logs: `/aws/lambda/handycall-call-orchestrator`
- Verify Lambda has Connect invoke permission (should already be set)
- Make sure flow is **Published** (not just saved)

### "Company not found" in logs
- Verify phone number in DynamoDB matches exactly: `+16057052030`
- Check the phone-index GSI exists on companies table

### No audio / silent call
- Check Lambda is returning response in correct format
- Verify `$.External.response` is set in MessageParticipant block
- Check CloudWatch logs for Lambda errors

---

## Summary

**You're 95% done!** Just need to:
1. Import `handycall-flow-final.json` via Console (2 min)
2. Associate phone number with the flow (1 min)
3. Test by calling +16057052030 (2 min)

Total time: ~5 minutes! 🎉

