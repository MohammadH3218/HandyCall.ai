# ✅ HandyCall AI Setup - Almost Complete!

**Date**: January 1, 2026
**Status**: 95% Complete - 2 Quick Fixes Needed

---

## 🎉 What's Already Done

### ✅ Lambda Functions
- **handycall-call-orchestrator**: ✅ Deployed with correct STRING_MAP return format
- **handycall-post-call-processor**: ✅ Deployed
- **Associated with Connect**: ✅ Yes

### ✅ Amazon Lex Bot
- **Name**: HandyCallVoiceBot
- **Bot ID**: MB9C3YAJSG
- **Locale**: en_US (English, Joanna voice)
- **Intent**: FreeConversationIntent (catch-all)
- **Alias**: ProductionAlias (EU1XLNNWLC)
- **Status**: ✅ Built and ready
- **Associated with Connect**: ✅ Yes

### ✅ Contact Flow
- **Name**: HandyCall Conversational AI
- **ID**: e65be6c8-63b3-48f3-8e04-0377384df3dd
- **Status**: ✅ Published and ACTIVE

### ✅ Phone Number
- **Number**: +1 605-705-2030
- **Assigned Flow**: ✅ HandyCall Conversational AI
- **Status**: ✅ Ready to receive calls

### ✅ DynamoDB Test Data
- **Company**: HandyCall Test Company (test-company-001)
- **Phone**: +16057052030
- **Agent Config**: ✅ Created with custom greeting
- **Status**: ✅ ACTIVE

---

## 🚨 2 CRITICAL FIXES REQUIRED (2 Minutes)

Your contact flow is published but has 2 configuration issues that will prevent it from working:

### **Fix #1: Add Lex Bot to "Get Caller Speech"** (60 seconds)

**Problem**: The flow is NOT using Lex for speech recognition - it's only listening for DTMF keypad input.

**How to Fix**:
1. Go to [Amazon Connect Console](https://console.aws.amazon.com/connect/)
2. Select your instance: **handycall-prod**
3. Left menu → **Routing** → **Contact flows**
4. Open: **HandyCall Conversational AI**
5. Click the **"Get Caller Speech"** block
6. Scroll to **"Amazon Lex"** section
7. Click **"Select a bot"**
8. Choose:
   - **Bot**: `HandyCallVoiceBot`
   - **Alias**: `ProductionAlias`
9. Click **Save** (on the block)

---

### **Fix #2: Change UserInput to Use InputTranscript** (60 seconds)

**Problem**: The Lambda is receiving the wrong data format.

**Current (WRONG)**:
```
UserInput = $.Lex.Slots.text
```

**Should Be**:
```
UserInput = $.Lex.InputTranscript
```

**How to Fix**:
1. In the same flow editor
2. Click the **"Invoke AI Conversation"** block
3. Scroll to **"Function input parameters"**
4. Find the row where **Key** = `UserInput`
5. In the **Value** column, click to edit
6. Ensure "Set dynamically" is enabled
7. Set:
   - **Namespace**: `Lex`
   - **Key**: `Input transcript` (NOT "Slots.text")
8. Click **Save** (on the block)

---

### **Fix #3: Publish**

1. Click **Save** (top right - saves the entire flow)
2. Click **Publish**

---

## 🧪 Testing Your AI Receptionist

### Prerequisites Checklist

✅ Lambda deployed with STRING_MAP format
✅ Lex bot built and associated
✅ Contact flow published
✅ Phone number assigned to flow
✅ Company record exists in DynamoDB
✅ Agent config exists
⏳ Lex bot added to "Get Caller Speech" block
⏳ UserInput parameter fixed

### How to Test

1. **Call**: +1 605-705-2030
2. **Expected Flow**:
   - You hear: "Hello! Thank you for calling HandyCall Test Company. I'm your AI assistant. How can I help you today?"
   - System says: "How can I help you?"
   - **You speak**: "What services do you offer?"
   - AI responds with an answer (may say it doesn't have info yet - normal!)
   - Call ends

### Debugging

**If call fails or you hear silence:**

1. **Check CloudWatch Logs**:
   - Service: CloudWatch
   - Log Group: `/aws/lambda/handycall-call-orchestrator`
   - Look for recent invocations
   - Check for errors

2. **Check Contact Trace Record**:
   - Connect Console → **Analytics and optimization** → **Contact search**
   - Find your call by phone number
   - View the contact flow path
   - See where it failed

3. **Common Issues**:
   - "Sorry, an error occurred" → Lambda error (check CloudWatch)
   - Silence after greeting → Lex not configured (Fix #1 not done)
   - No AI response → UserInput wrong (Fix #2 not done)
   - "Cannot process call" → Company record not found (check phone number in DynamoDB)

---

## 📊 Architecture Overview

```
Incoming Call (+1 605-705-2030)
    ↓
Amazon Connect (handycall-prod)
    ↓
Contact Flow: "HandyCall Conversational AI"
    ↓
[Enable Recording]
    ↓
[Invoke Lambda - Greeting] → handycall-call-orchestrator
    ↓                          ↓
    ↓                     [Query DynamoDB]
    ↓                     - handycall_prod_companies (by phone)
    ↓                     - handycall_prod_agent_configs
    ↓                          ↓
    ↓                     [Return {response: "greeting"}]
    ↓ ←-------------------┘
[Play AI Greeting] → TTS speaks $.External.response
    ↓
[Get Caller Speech] → Amazon Lex (HandyCallVoiceBot)
    ↓                   - Converts speech to text
    ↓                   - Returns $.Lex.InputTranscript
    ↓
[Invoke Lambda - Conversation] → handycall-call-orchestrator
    ↓                              ↓
    ↓                         [RAG Service]
    ↓                         - Query handycall_prod_knowledge_chunks
    ↓                         - Get embeddings (Bedrock Titan)
    ↓                         - Find relevant knowledge
    ↓                              ↓
    ↓                         [Bedrock Claude 3.5 Sonnet]
    ↓                         - Generate response
    ↓                         - Check confidence
    ↓                         - Flag if low confidence
    ↓                              ↓
    ↓                         [Return {response: "AI answer"}]
    ↓ ←-----------------------┘
[Play AI Response] → TTS speaks $.External.response
    ↓
[Disconnect]
```

---

## 🎯 Next Steps After Testing Works

### 1. Add Real Knowledge
```bash
# Create knowledge items in DynamoDB
Table: handycall_prod_knowledge_items
- company_id: test-company-001
- knowledge_id: <uuid>
- title: "Services We Offer"
- content: "We provide plumbing, electrical, and general handyman services..."
```

### 2. Add Conversation Loop
Currently the flow disconnects after one response. To add a loop:
- After "Play AI Response", add a "Check contact attributes" block
- Check if `$.Lex.InputTranscript` contains "goodbye" or "bye"
- If yes → Disconnect
- If no → Loop back to "Get Caller Speech"

### 3. Monitor and Improve
- Review flagged questions daily
- Add answers to knowledge base
- Monitor call recordings
- Check sentiment scores

---

## 📁 Files Created

- [contact-flow-analysis.md](contact-flow-analysis.md) - Detailed flow analysis
- [test-company.json](test-company.json) - Test company record
- [test-agent-config.json](test-agent-config.json) - Agent configuration
- [handycall-conversational-flow.json](handycall-conversational-flow.json) - Flow template
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - This file

---

## 🆘 Need Help?

- **CloudWatch Logs**: `/aws/lambda/handycall-call-orchestrator`
- **Connect Console**: Check Contact Trace Records
- **DynamoDB**: Verify company record exists with correct phone

---

## ✅ Completion Checklist

Before making your first test call:

- [x] Lambda functions deployed
- [x] Lex bot built and associated
- [x] Contact flow created and published
- [x] Phone number assigned to flow
- [x] Company record in DynamoDB
- [x] Agent config in DynamoDB
- [ ] **Lex bot added to "Get Caller Speech" block** ⚠️ FIX THIS
- [ ] **UserInput parameter using InputTranscript** ⚠️ FIX THIS
- [ ] Flow re-published after fixes
- [ ] Test call successful

**Once you complete the 2 fixes above, you're ready to test!** 🎉
