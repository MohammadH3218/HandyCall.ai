# Amazon Connect Setup Guide

This guide covers the remaining manual steps to complete your HandyCall AI voice receptionist setup.

## Current Status

### ✅ Completed (via AWS CLI)
- Amazon Connect instance created (ID: `e55edc1b-5259-45ce-bb2c-1b3248c6031b`)
- Lambda functions deployed:
  - `handycall-call-orchestrator` - Real-time call handling with Claude Sonnet
  - `handycall-post-call-processor` - Post-call transcription and analysis
- S3 trigger configured (recordings → post-call processor)
- Lambda permissions granted for Connect invocation
- DynamoDB tables created (12 tables)
- IAM roles configured

### ⚠️ Manual Steps Required (AWS Console)

## Step 1: Claim a Phone Number

Amazon Connect phone numbers cannot be claimed via AWS CLI for new instances. You must use the AWS Console:

1. Go to [Amazon Connect Console](https://console.aws.amazon.com/connect/)
2. Select your instance: `handycall-prod` (ID: e55edc1b-5259-45ce-bb2c-1b3248c6031b)
3. Navigate to **Channels** → **Phone numbers**
4. Click **Claim a number**
5. Choose:
   - **Toll-free** (recommended for business, e.g., 1-800-XXX-XXXX)
   - **DID** (direct inward dialing, local numbers)
6. Select a number from available options
7. Click **Claim**

**Note**: Save the claimed phone number - you'll need it for testing and to provide to customers.

## Step 2: Import and Configure Contact Flow

### Option A: Import Template (Recommended for Quick Start)

1. Go to **Routing** → **Contact flows** in the Connect console
2. Click **Create contact flow**
3. Click the dropdown (⌄) next to **Save** → **Import flow**
4. Select the file: `connect-contact-flow.json` from your project root
5. Review the flow in the visual editor
6. Click **Save** then **Publish**

### Option B: Build from Scratch (Recommended for Production)

Create a more sophisticated flow with these blocks:

```
Start
  ↓
Set Contact Attributes
  - UserInput = "" (for first greeting)
  ↓
Invoke AWS Lambda Function
  - Function: handycall-call-orchestrator
  - Timeout: 8 seconds
  ↓
Play Prompt (Text-to-Speech)
  - Type: Text
  - Text: $.External.response (from Lambda)
  - Voice: Neural (Matthew/Joanna)
  ↓
Get Customer Input
  - Type: Speech (Transcribe enabled)
  - Timeout: 10 seconds
  - Store result in: UserInput attribute
  ↓
[Loop back to Invoke Lambda]
  ↓
Disconnect / End Call
```

**Key Configuration:**
- Enable **Amazon Transcribe** for speech-to-text
- Use **Neural voices** (higher quality)
- Set appropriate timeouts (8s for Lambda, 10s for customer input)
- Store user speech in `UserInput` contact attribute

## Step 3: Associate Phone Number with Contact Flow

1. Go to **Channels** → **Phone numbers**
2. Click on your claimed phone number
3. Under **Contact flow / IVR**, select the contact flow you created
4. Click **Save**

## Step 4: Enable Call Recording (Optional but Recommended)

1. Go to **Analytics and optimization** → **Call recordings**
2. Enable call recording
3. Set storage location: `s3://handycall-recordings-prod/recordings/`
4. Choose encryption: Server-side encryption (SSE-S3)
5. Click **Save**

**Important**: Ensure recordings are saved with this path pattern:
```
recordings/{company_id}/{call_id}.wav
```

You may need to customize the recording file naming in the contact flow.

## Step 5: Register Company Phone Numbers

For the system to route calls to the correct company, you need to register company phone numbers in DynamoDB:

```bash
# Example: Register your Connect number for a test company
aws dynamodb put-item \
  --table-name handycall_prod_companies \
  --item '{
    "company_id": {"S": "test-company-123"},
    "company_name": {"S": "Test Plumbing Inc"},
    "phone_number": {"S": "+18005551234"},
    "industry": {"S": "plumbing"},
    "status": {"S": "ACTIVE"},
    "created_at": {"N": "'$(date +%s%3N)'"},
    "updated_at": {"N": "'$(date +%s%3N)'"}
  }'
```

Replace:
- `+18005551234` with your claimed Connect number
- `test-company-123` with your company ID
- `Test Plumbing Inc` with your company name

## Step 6: Add Knowledge Base Content

Create knowledge items for the AI to use during calls:

```bash
# Example via backend API (start backend first: cd packages/backend && npm run start:dev)
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Business Hours",
    "content": "We are open Monday through Friday, 8 AM to 6 PM EST. Closed weekends and major holidays.",
    "type": "FAQ"
  }'
```

## Step 7: Test the System

### Test Call Flow:

1. Call your claimed phone number from your mobile phone
2. Expected flow:
   - AI greets you (from agent_config or default greeting)
   - You speak a question
   - Transcribe converts speech to text
   - Lambda queries knowledge base (RAG)
   - Bedrock Claude generates response
   - Polly converts response to speech
   - You hear the AI response
   - Loop continues until you hang up or say goodbye

### Monitor in Real-Time:

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/handycall-call-orchestrator --follow

# In another terminal
aws logs tail /aws/lambda/handycall-post-call-processor --follow
```

### Verify in DynamoDB:

```bash
# Check if call was recorded
aws dynamodb scan --table-name handycall_prod_calls --max-items 5

# Check if contact was created
aws dynamodb scan --table-name handycall_prod_contacts --max-items 5

# Check for flagged questions (low confidence)
aws dynamodb scan --table-name handycall_prod_flagged_questions --max-items 5
```

## Step 8: View Results

### After Call Processing (automatic):

When the call ends and recording is uploaded to S3, the post-call processor Lambda will:

1. Transcribe the full conversation
2. Generate a summary with Claude Haiku
3. Extract highlights (pricing mentions, complaints, appointments)
4. Detect flagged questions
5. Store transcript in S3: `s3://handycall-transcripts-prod/transcripts/{company_id}/{call_id}.json`

View the transcript:

```bash
# List recent transcripts
aws s3 ls s3://handycall-transcripts-prod/transcripts/ --recursive | tail -5

# Download a transcript
aws s3 cp s3://handycall-transcripts-prod/transcripts/test-company-123/{call_id}.json ./transcript.json
cat transcript.json | jq .
```

## Troubleshooting

### Lambda Not Invoked

- Check Lambda CloudWatch logs for errors
- Verify Contact Flow has correct Lambda ARN
- Ensure Lambda has Connect invoke permission (already configured)

### No Audio Response

- Check Connect logs in CloudWatch Logs group: `/aws/connect/handycall-prod`
- Verify Lambda returns correct response format:
  ```json
  {
    "statusCode": 200,
    "body": "{\"response\": \"Hello, how can I help you?\"}"
  }
  ```

### Transcription Fails

- Check S3 bucket permissions
- Verify recording file format (should be WAV)
- Check post-call processor Lambda logs

### Low Confidence / Flagged Questions

This is expected behavior! When the AI doesn't have knowledge to answer confidently:
1. It still provides a best-effort response
2. Creates a flagged question record in DynamoDB
3. Business owner reviews and answers via dashboard
4. Answer automatically becomes new knowledge (learning loop)

View flagged questions:

```bash
aws dynamodb scan --table-name handycall_prod_flagged_questions \
  --filter-expression "status = :status" \
  --expression-attribute-values '{":status":{"S":"OPEN"}}'
```

## Next Steps

1. **Production Hardening**: Add CloudWatch alarms for Lambda errors, Bedrock throttling
2. **Business Hours**: Implement business hours logic in contact flow
3. **Call Routing**: Add "ring owner phone first" before AI takes over
4. **Multi-language**: Configure Transcribe for multiple languages
5. **Advanced Features**: Appointment booking, SMS follow-ups, CRM integration

## Key ARNs and IDs

- **Connect Instance**: `e55edc1b-5259-45ce-bb2c-1b3248c6031b`
- **Call Orchestrator Lambda**: `arn:aws:lambda:us-east-1:982081079378:function:handycall-call-orchestrator`
- **Post-Call Processor Lambda**: `arn:aws:lambda:us-east-1:982081079378:function:handycall-post-call-processor`
- **Recordings Bucket**: `s3://handycall-recordings-prod`
- **Transcripts Bucket**: `s3://handycall-transcripts-prod`
- **DynamoDB Table Prefix**: `handycall_prod_`

## Support

For issues or questions:
- Check CloudWatch Logs for Lambda functions
- Review DynamoDB tables for data issues
- Verify IAM permissions on HandyCallLambdaExecutionRole
- Test knowledge base queries via backend API before testing calls
