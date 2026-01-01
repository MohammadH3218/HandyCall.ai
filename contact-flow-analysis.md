# Contact Flow Analysis - HandyCall Conversational AI

## ✅ What's Working Correctly

1. **Recording Enabled**: ✅ Both agent and customer voice recording enabled
2. **Invoke AI Greeting**: ✅ Calls `handycall-call-orchestrator` with STRING_MAP response
3. **Play AI Greeting**: ✅ Uses `$.External.response` (correct)
4. **Play AI Response**: ✅ Uses `$.External.response` (correct)
5. **Error Handling**: ✅ Error branches route to error message → disconnect
6. **Flow Published**: ✅ Active and published

---

## 🚨 CRITICAL ISSUES FOUND

### Issue 1: Lex Bot Not Configured (BLOCKING)

**Block**: "Get Caller Speech"

**Problem**: The block is configured as a basic "Get customer input" WITHOUT the Lex bot attached. This means:
- ❌ It's only collecting DTMF (keypad) input, NOT speech
- ❌ No speech-to-text happening
- ❌ Won't capture caller voice

**Current Config**:
```json
{
  "StoreInput": "False",
  "InputTimeLimitSeconds": "8",
  "Text": "How can I help you?"
  // ❌ NO Lex bot configured!
}
```

**Should Be**:
```json
{
  "StoreInput": "False",
  "InputTimeLimitSeconds": "8",
  "Text": "How can I help you?",
  "LexV2Bot": {
    "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
  }
}
```

---

### Issue 2: Wrong Transcript Reference (CRITICAL)

**Block**: "Invoke AI Conversation"

**Problem**: The UserInput parameter is reading from the wrong location:

**Current (WRONG)**:
```json
"UserInput": "$.Lex.Slots.text"
```

**Should Be**:
```json
"UserInput": "$.Lex.InputTranscript"
```

**Why This Matters**:
- `$.Lex.Slots.text` is for structured Lex slot values (like "pizza" from "I want pizza")
- `$.Lex.InputTranscript` is the raw transcription of what the caller said
- Your Lambda expects the full transcript, not a slot value

---

## 🔧 How to Fix (Manual Steps Required)

### Fix 1: Add Lex Bot to "Get Caller Speech" Block

1. Open the flow in Connect console
2. Click the **"Get Caller Speech"** block
3. Under "Amazon Lex", select:
   - **Bot**: HandyCallVoiceBot
   - **Alias**: ProductionAlias
4. Keep the prompt: "How can I help you?"
5. Save the block

### Fix 2: Correct the UserInput Parameter

1. Click the **"Invoke AI Conversation"** block
2. Scroll to "Function input parameters"
3. Find the parameter "UserInput"
4. Click the dropdown/config for this parameter
5. Change:
   - **Namespace**: Lex
   - **Key**: Input transcript (not "Slots.text")
6. Save the block

### Fix 3: Save and Publish

1. Click **Save**
2. Click **Publish**

---

## 📊 Expected Behavior After Fix

**Before Fix**:
- Call comes in → greeting plays → "How can I help you?" → waits for DTMF tones (won't work)

**After Fix**:
- Call comes in → greeting plays → "How can I help you?" → Lex captures speech → sends transcript to Lambda → AI responds

---

## 🧪 Next Steps After Fixing

1. Fix the two issues above
2. Assign flow to phone number +1 605-705-2030
3. Create test company record in DynamoDB
4. Make test call
