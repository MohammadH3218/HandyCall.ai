# Quick Start Guide - HandyCall Voice AI Deployment

This guide will help you deploy the HandyCall AI voice receptionist infrastructure in under 30 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS CLI installed and configured (`aws --version`)
- [ ] AWS credentials with admin permissions
- [ ] Python 3.x installed (`python --version`)
- [ ] Git Bash or bash shell (for Windows users)
- [ ] Bedrock model access requested for:
  - [ ] Amazon Titan Embed Text v2 (or v1)
  - [ ] Anthropic Claude 3 Haiku
  - [ ] Anthropic Claude 3 Sonnet

**To request Bedrock model access:**
1. Go to AWS Console > Bedrock
2. Navigate to "Model access" in the left menu
3. Request access for the models listed above

## Step 1: Deploy Infrastructure (15 minutes)

Open PowerShell in the project root directory and run:

```powershell
.\infrastructure\scripts\deploy-handycall-voice-ai.ps1 -Environment dev
```

This will:
- Create S3 buckets for artifacts and knowledge base
- Build Lambda functions from the reference implementation
- Deploy Bedrock Knowledge Base stack
- Deploy Lex bot and RAG solution stack
- Configure Amazon Connect integration (if instance exists)

**Note:** First deployment takes about 15-20 minutes. Subsequent deployments are faster.

### If you get errors:

**"Python not found"**
- Install Python from https://www.python.org/downloads/
- Ensure Python is added to PATH during installation

**"bash not found"** 
- Install Git for Windows (includes Git Bash)
- Or use WSL (Windows Subsystem for Linux)

**"AWS credentials not found"**
- Run `aws configure` to set up credentials
- Or set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## Step 2: Upload Knowledge Base Content (5 minutes)

After deployment completes, upload content to the knowledge base:

```powershell
# Use sample content from reference implementation (for testing)
.\infrastructure\scripts\upload-knowledge-base-content.ps1 -Environment dev
```

**Or upload your own content:**
```powershell
.\infrastructure\scripts\upload-knowledge-base-content.ps1 -Environment dev -ContentPath "C:\path\to\your\documents"
```

**Then sync the knowledge base:**
1. Go to **AWS Console > Bedrock > Knowledge Bases**
2. Find your knowledge base: `handycall-voice-ai-dev-kb`
3. Click on the data source
4. Click **"Sync"** button
5. Wait 1-2 minutes for sync to complete

## Step 3: Test the Lex Bot (5 minutes)

### Option A: Using Test Script

```powershell
# Simple test
.\infrastructure\scripts\test-lex-bot.ps1 -Environment dev -InputText "Hello"

# Continue conversation
.\infrastructure\scripts\test-lex-bot.ps1 -Environment dev -SessionId "test-session-20250101000000" -InputText "What services do you offer?"
```

### Option B: Using Lex Console

1. Go to **AWS Console > Amazon Lex**
2. Select bot: `handycall-receptionist-dev`
3. Click **"Test"** tab
4. Type messages to test the bot

**Try these test queries:**
- "Hello"
- "What services do you offer?"
- "How do I book an appointment?"
- "Tell me about your company"

## Step 4: Test with Amazon Connect (Optional, 10 minutes)

If you have an Amazon Connect instance:

1. Go to **AWS Console > Amazon Connect**
2. Select your instance
3. Go to **Routing > Contact flows**
4. Find: `handycall-ai-receptionist-dev`
5. Click on it to view/edit
6. Go to **Phone numbers** and assign a number to this flow
7. Call the number to test!

## What Was Deployed

### CloudFormation Stacks

- `handycall-voice-ai-dev-kb` - Bedrock Knowledge Base
- `handycall-voice-ai-dev-rag` - Lex Bot + Lambda Functions

### S3 Buckets

- `handycall-voice-ai-artifacts-ACCOUNT-dev` - Lambda deployment packages
- `handycall-knowledge-base-ACCOUNT-dev` - Knowledge base documents

### Lex Bot

- **Name**: `handycall-receptionist-dev`
- **Language**: English (US)
- **Intents**: Pre-configured with sample intents from reference implementation

### Lambda Functions

- **Lex Fulfillment Handler** - Processes user intents and queries Knowledge Base
- **Contact Flow Custom Resource** - Adds contact flow to Connect instance

## Next Steps

### Customize for Your Business

1. **Modify Intents**: Add your business-specific intents in Lex console
2. **Update Knowledge Base**: Add your company documents and FAQ
3. **Customize Responses**: Modify Lambda handler code for your tone/voice
4. **Add Multi-Tenancy**: Adapt Lambda handler to filter by `company_id` (see integration guide)

### Integration with HandyCall

The deployed infrastructure is ready to integrate with HandyCall's backend:

- Lex bot events can be forwarded to your NestJS backend
- Knowledge Base can be synced with DynamoDB knowledge items
- Call records can be stored in HandyCall's `calls` table

See `infrastructure/README.md` for detailed integration instructions.

## Troubleshooting

### Deployment Fails at "Creating S3 Bucket"

**Solution**: Bucket name might already exist. Try:
```powershell
.\infrastructure\scripts\deploy-handycall-voice-ai.ps1 -Environment dev -CleanFirst
```

### Lambda Build Fails

**Solution**: Check Python and pip installation:
```powershell
python --version
pip --version
```

If missing, install Python and ensure it's in PATH.

### Knowledge Base Sync Fails

**Check**:
- S3 bucket permissions are correct
- Documents are in supported formats (PDF, Word, text)
- Bedrock service quotas haven't been exceeded

**Fix**: Check CloudWatch logs for the Bedrock data source sync.

### Bot Doesn't Respond

**Check**:
1. CloudWatch logs for Lambda function errors
2. Lex bot fulfillment Lambda configuration
3. IAM permissions for Lex to invoke Lambda

**Fix**: Review stack outputs for Lambda function ARN and verify it's set in Lex bot.

## Getting Help

- **Reference Implementation**: https://github.com/aws-samples/contact-center-genai-agent
- **AWS Documentation**: 
  - [Amazon Lex](https://docs.aws.amazon.com/lex/)
  - [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/)
  - [Amazon Connect](https://docs.aws.amazon.com/connect/)

## Clean Up

To remove all deployed resources:

```powershell
# Delete stacks
aws cloudformation delete-stack --stack-name handycall-voice-ai-dev-rag --region us-east-1
aws cloudformation delete-stack --stack-name handycall-voice-ai-dev-kb --region us-east-1

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name handycall-voice-ai-dev-rag --region us-east-1
aws cloudformation wait stack-delete-complete --stack-name handycall-voice-ai-dev-kb --region us-east-1
```

**Note**: S3 buckets will not be automatically deleted. Empty and delete them manually if needed.


