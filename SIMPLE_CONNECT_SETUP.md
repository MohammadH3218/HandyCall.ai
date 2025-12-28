# Simple Amazon Connect Setup - Visual Editor Guide

Since the CLI for contact flows is complex, here's the easiest way to finish your setup using what you've already started:

## Your Phone Number: +16057052030

## Step 1: Complete Your Contact Flow (5 minutes)

You've already started "handycall-inbound-ai" - let's finish it:

### Block 1: Entry → Set Contact Attributes ✅ (You have this)
- Already configured with UserInput attribute

### Block 2: Invoke AWS Lambda Function ✅ (You have this)
- Function ARN: `arn:aws:lambda:us-east-1:982081079378:function:handycall-call-orchestrator`
- **Important**: Click on the Lambda block and add these settings:
  - Timeout: **8 seconds**
  - **Function input parameters**: Click "+ Add parameter"
    - Key: `UserInput`
    - Value: `$.Attributes.UserInput` (select from dropdown)
  - This passes the user's speech to your Lambda

### Block 3: Play Prompt (Add this)
From Block Library → **Interact** → **Play prompt**:
- Type: **Text-to-Speech**
- Text to speak: Click "Set dynamically"
  - Select: `$.External.response` (this is what your Lambda returns)
- Voice: **Matthew** (or Joanna for female voice)
- Connect Success → to next block
- Connect Error → to Disconnect

### Block 4: Get Customer Input (Add this)
From Block Library → **Interact** → **Get customer input**:
- Input type: **Text** (we'll use DTMF for simplicity first, you can enable speech later)
- Text to play: "I'm listening. Press 1 to continue or pound to end."
- Set timeout: **10 seconds**
- DTMF Settings:
  - Max digits: **1**
  - Terminating digit: **#** (pound key to hangup)
- **Store customer input**:
  - Select: **Set contact attributes**
  - Attribute name: `UserInput`
- Connect "Pressed 1" → back to Lambda block (creates loop)
- Connect "Pressed #" → to Disconnect
- Connect "Timeout" → to Disconnect

### Block 5: Disconnect (Add this)
From Block Library → **Terminate** → **Disconnect**
- This ends the call

## Step 2: Save and Publish

1. Click **Save** (top right)
2. Click **Publish** (next to Save)

## Step 3: Associate Phone Number with Contact Flow

### Via AWS Console:
1. In Connect, go to **Channels** → **Phone numbers**
2. Click on your number: `+16057052030`
3. Under **Contact flow / IVR**, select: **handycall-inbound-ai**
4. Click **Save**

### Or via AWS CLI (faster):
```bash
# Get phone number ID
PHONE_ID="91c44d1d-fd3c-4c57-8ea5-c98e146d4b59"

# Get your contact flow ID (run this after you save the flow)
FLOW_ID=$(aws connect list-contact-flows \
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b \
  --query 'ContactFlowSummaryList[?contains(Name,`handycall`)].Id' \
  --output text)

# Associate phone with flow
aws connect update-phone-number \
  --phone-number-id $PHONE_ID \
  --target-arn arn:aws:connect:us-east-1:982081079378:instance/e55edc1b-5259-45ce-bb2c-1b3248c6031b/contact-flow/$FLOW_ID
```

## Step 4: Enable Call Recording (Optional)

In your contact flow, add this block BEFORE the Set Contact Attributes:

From Block Library → **Set** → **Set recording and analytics behavior**:
- Call recording: **Agent and Customer**
- Conversation analytics: **Enable** (optional - provides sentiment analysis)
- Connect Success → to Set Contact Attributes

## Step 5: Test!

1. Call **+16057052030** from your phone
2. You should hear the AI greeting
3. After greeting, press **1** to continue conversation
4. Press **#** to end call

---

## Simplified Version (Even Easier)

If the above is still complex, use this MINIMAL flow:

```
Entry → Invoke Lambda → Play Prompt → Disconnect
```

1. Entry (automatic)
2. **Invoke Lambda** (you have this)
   - Just make sure it has your function ARN
3. **Play Prompt**
   - Text: `$.External.response`
4. **Disconnect**

This will work for testing - the AI will answer once, then hang up. You can add the loop later.

---

## Troubleshooting

### "External.response not found"
- Make sure your Lambda returns JSON like:
  ```json
  {
    "statusCode": 200,
    "body": "{\"response\": \"Hello from AI!\"}"
  }
  ```
- The flow accesses the parsed JSON with `$.External.response`

### Lambda not invoking
- Check CloudWatch logs: `/aws/lambda/handycall-call-orchestrator`
- Verify Lambda has Connect invoke permission (already configured)

### No audio
- Check that "Text to speak" uses `$.External.response` not plain text
- Verify voice is selected (Matthew/Joanna)

---

## What Happens When Someone Calls

1. **Call comes in** → Contact flow starts
2. **Set UserInput** → Empty string (first time, no input yet)
3. **Invoke Lambda** → Sends to your orchestrator function
   - Lambda looks up company by phone (+16057052030)
   - Returns greeting: "Hello! Thank you for calling..."
4. **Play Prompt** → AI speaks the greeting via Polly
5. **Get Input** → Waits for customer to press 1
6. **Loop back to Lambda** → Customer's input processed
7. **Repeat** until customer presses #

---

## Next: Add Speech Input (After Basic Flow Works)

Once you have DTMF working, upgrade to speech:

In "Get customer input" block:
- Change input type to: **Text (Speech)**
- Amazon Transcribe settings:
  - Language: **English (US)**
  - Store as: `UserInput` attribute

This will transcribe customer speech automatically!
