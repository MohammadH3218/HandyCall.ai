# HandyCall - Ready to Test! 🎉

## ✅ What's Been Set Up (via AWS CLI)

### 1. Your Phone Number
- **Number**: +16057052030
- **Type**: DID (Local number)
- **Status**: Claimed and ready

### 2. Company Registration
- **Company ID**: test-handycall-001
- **Company Name**: HandyCall Test Company
- **Phone**: +16057052030 (mapped to your Connect number)
- **Status**: ACTIVE

### 3. AI Agent Configuration
- **Greeting**: "Hello, thank you for calling HandyCall. I am your AI assistant. How may I help you today?"
- **Confidence Threshold**: 70% (flags low-confidence questions)
- **Max Turns**: 10 conversation rounds
- **Can Discuss Pricing**: Yes

### 4. Sample Knowledge Base (3 items)
- Business Hours
- Services Offered
- Contact Information

**Note**: These knowledge items don't have embeddings yet, so RAG won't work until you add them via the backend API. But the AI will still respond using Claude's general knowledge.

---

## 🎯 Final Steps (5 Minutes in Visual Editor)

You already have the contact flow started. Here's the SIMPLEST way to finish:

### Option A: Minimal Test Flow (Fastest - 2 minutes)

Keep it super simple for first test:

```
Entry → Set Contact Attributes (you have this) → Invoke Lambda (you have this) → Play Prompt → Disconnect
```

#### What to add:

**1. Click on your Lambda block**
   - Function ARN should be: `arn:aws:lambda:us-east-1:982081079378:function:handycall-call-orchestrator`
   - Set timeout to **8 seconds**
   - You're good!

**2. Add "Play Prompt" block**
   - From Block Library → **Interact** → **Play prompt**
   - Type: **Text-to-Speech**
   - Click "Set dynamically" → Select `External` → `response`
     - This displays as: `$.External.response`
   - Voice: **Matthew** (or Joanna)
   - Connect **Success** → to Disconnect block

**3. Add "Disconnect" block**
   - From Block Library → **Terminate** → **Disconnect**
   - That's it!

**4. Save and Publish**
   - Click **Save** (top right)
   - Click **Publish**

**5. Associate with Phone Number**

Run this command:

```bash
# Get your flow ID (after you save it)
aws connect list-contact-flows --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b --query 'ContactFlowSummaryList[?contains(Name,`handycall`)].Id' --output text

# Copy the ID it returns, then run:
aws connect update-phone-number \
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 \
  --target-arn arn:aws:connect:us-east-1:982081079378:instance/e55edc1b-5259-45ce-bb2c-1b3248c6031b/contact-flow/YOUR_FLOW_ID_HERE
```

---

### Option B: Full Conversation Loop (Better - 5 minutes)

If you want the AI to have a back-and-forth conversation:

Add these blocks between "Play Prompt" and "Disconnect":

**4. Get Customer Input**
   - From Block Library → **Interact** → **Get customer input**
   - Input type: **DTMF** (keypad) for now (easier than speech)
   - Text to play: "Press 1 to continue or pound to end the call"
   - Max digits: **1**
   - Timeout: **10 seconds**
   - **Store customer input**:
     - Type: **Set contact attributes**
     - Attribute: `UserInput`
   - Connect **Pressed 1** → back to your "Set Contact Attributes" block (creates loop)
   - Connect **Pressed #** → to Disconnect
   - Connect **Timeout** → to Disconnect

This creates a conversation loop:
1. AI speaks
2. User presses 1 to ask another question
3. AI responds to new question
4. Repeat until user presses #

---

## 🧪 Testing Your Setup

### 1. Make a Test Call

Call: **+16057052030**

**Expected flow:**
1. You'll hear: "Hello, thank you for calling HandyCall. I am your AI assistant. How may I help you today?"
2. (If you added the loop) Press **1** to ask another question or **#** to hang up
3. (If minimal flow) Call will end after greeting

### 2. Monitor in Real-Time

Open a terminal and watch the logs:

```bash
aws logs tail /aws/lambda/handycall-call-orchestrator --follow
```

### 3. Check What Was Created

After your call:

```bash
# View call record
aws dynamodb scan --table-name handycall_prod_calls --max-items 1

# View contact record
aws dynamodb scan --table-name handycall_prod_contacts --max-items 1

# Check for flagged questions (low confidence responses)
aws dynamodb scan --table-name handycall_prod_flagged_questions
```

---

## 🔧 Troubleshooting

### "Lambda function failed"
- Check logs: `aws logs tail /aws/lambda/handycall-call-orchestrator --follow`
- Verify company exists: `aws dynamodb get-item --table-name handycall_prod_companies --key '{"company_id":{"S":"test-handycall-001"}}'`

### "No audio" or "Response not played"
- Make sure Play Prompt uses `$.External.response` (with the dollar sign and dot)
- Check that Lambda block is configured correctly
- Verify Matthew voice is selected

### Want to hear the AI answer questions?

The knowledge base items exist but don't have embeddings yet. To add them properly:

1. Start your backend:
   ```bash
   cd packages/backend
   npm run start:dev
   ```

2. Add knowledge via API (this will create embeddings):
   ```bash
   curl -X POST http://localhost:3000/api/v1/knowledge \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "title": "Business Hours",
       "content": "We are open Monday-Friday 9 AM to 6 PM Eastern Time",
       "type": "FAQ"
     }'
   ```

Or just test with general knowledge questions like:
- "What time is it?"
- "Tell me about AI"
- "What services do you offer?" (might work from Claude's context in the prompt)

---

## 📊 What Happens Behind the Scenes

When someone calls +16057052030:

1. **Connect** receives the call
2. **Contact Flow** starts
3. **Set Contact Attributes** sets `UserInput = ""`
4. **Invoke Lambda** calls your orchestrator function
5. **Lambda**:
   - Looks up company by phone (+16057052030) → finds "test-handycall-001"
   - Loads agent config → gets custom greeting
   - Creates/finds contact record in DynamoDB
   - Creates call record in DynamoDB
   - (Tries RAG retrieval - will be empty until embeddings exist)
   - Calls Bedrock Claude 3.5 Sonnet
   - Returns response: "Hello, thank you for calling HandyCall..."
6. **Play Prompt** speaks the response via Polly
7. **(If you added loop)** **Get Input** waits for user to press 1 or #
8. **Disconnect** ends call

---

## 🚀 Next Steps After Basic Test Works

1. **Add Speech Input** - Change "Get customer input" from DTMF to Speech (Amazon Transcribe)
2. **Add Knowledge** - Use backend API to add knowledge with embeddings for RAG
3. **Enable Recording** - Add "Set recording behavior" block to save call recordings
4. **Add Business Hours** - Add hours check before AI takeover
5. **Ring Owner First** - Add "Transfer to phone number" block before AI (with 20s timeout)

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| [SIMPLE_CONNECT_SETUP.md](SIMPLE_CONNECT_SETUP.md) | Detailed visual editor instructions |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Complete technical overview |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | CLI commands cheat sheet |

---

## ✅ Ready to Go!

You now have:
- ✅ Lambda functions deployed and working
- ✅ DynamoDB tables with test data
- ✅ Phone number claimed
- ✅ Company registered
- ✅ Agent configured
- ✅ Sample knowledge added

**Just finish the contact flow in the visual editor (2-5 minutes) and you're live!**

Call **+16057052030** to test! 📞
