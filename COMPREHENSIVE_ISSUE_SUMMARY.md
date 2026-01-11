# HandyCall AI Voice Platform - Complete Issue Summary & Architecture

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Issues Encountered (Chronological)](#issues-encountered)
3. [Fixes Applied](#fixes-applied)
4. [Current Flow Architecture](#current-flow-architecture)
5. [Lambda Function Logic](#lambda-function-logic)
6. [Remaining Issues](#remaining-issues)
7. [Manual Configuration Steps](#manual-configuration-steps)
8. [Technical Details](#technical-details)

---

## 🏗️ Architecture Overview

### Platform: HandyCall AI Receptionist
- **Purpose**: AI-powered phone receptionist for local service businesses
- **Tech Stack**: 
  - Amazon Connect (Telephony)
  - Amazon Lex V2 (Conversational AI)
  - AWS Lambda (Node.js/TypeScript) - Call Orchestration
  - AWS Bedrock (Claude 3.5 Sonnet) - LLM
  - Amazon Titan Embed Text v1 - Embeddings
  - DynamoDB (Contact, Company, Agent Config, Knowledge Chunks, Calls)
  - RAG (Retrieval Augmented Generation) for knowledge-based responses

### Flow Pattern: Lex-First Architecture
- Connect Flow → Lex Bot → Lambda Code Hook → Bedrock LLM → Response
- Lex handles speech recognition, Lambda handles AI logic

---

## 🐛 Issues Encountered (Chronological)

### Issue #1: Infinite Greeting Loop (RESOLVED ✅)
**Problem:**
- AI would greet caller, then immediately loop back and repeat greeting
- Caller never got to speak, endless greeting loop

**Root Cause:**
- Contact flow's `ConnectParticipantWithLexBot` block had `Text` parameter set to greeting
- This parameter plays on EVERY loop back to Lex
- Lambda was also providing greeting, causing double greeting + loop

**Solution:**
- Removed `Text` parameter from `ConnectParticipantWithLexBot` block
- Lambda now handles greeting only on first turn

---

### Issue #2: "Speak/Speak" Prompt (RESOLVED ✅)
**Problem:**
- AI would say "speak" or "speak/speak" at beginning and end of every turn
- Very annoying for callers

**Root Cause:**
- "Get customer input" block's "Enter text to be spoken" field was set to `<speak></speak>` (empty SSML)
- Lex interprets this as a command to prompt user to speak

**Solution:**
- Changed Text field to single space ` ` or `<speak> </speak>` (non-empty)

---

### Issue #3: AI Reintroducing on Every Turn (RESOLVED ✅)
**Problem:**
- AI would say "Hello, I'm Sarah" (or similar) on every response
- Even after initial greeting, would reintroduce itself on subsequent turns
- Example: "Hello! I'm Sarah. We offer plumbing services." on turn 2, 3, 4, etc.

**Root Cause:**
- Bedrock LLM was generating greetings despite system prompt instructions
- Lambda's greeting prefix logic wasn't properly checking if greeting was already played
- First turn detection wasn't working correctly

**Solution:**
- Added very explicit system prompt instructions to NEVER greet
- Added aggressive post-processing to strip any greetings Bedrock might generate
- Fixed first turn detection logic (checks `first_turn_complete` flag first)
- Added `stripGreetings()` function with multiple regex patterns

---

### Issue #4: Slow Response Times (PARTIALLY RESOLVED ⚠️)
**Problem:**
- AI takes ~2-3 seconds to introduce itself
- Takes ~2.5 seconds to respond to each question
- Perceived as slow/unresponsive

**Root Cause:**
- Bedrock LLM inference takes ~2.3 seconds (inherent to LLM calls)
- First turn greeting was calling Bedrock unnecessarily
- RAG retrieval was happening even with 0 knowledge chunks (generating embeddings for nothing)

**Solution:**
- Optimized first turn greeting to use fast template (no Bedrock call) when input is empty
- Added quick check before RAG retrieval (skip if no knowledge chunks exist)
- Reduced `max_tokens` from 300 to 200
- Optimized system prompt (shorter)
- Reduced RAG retrieval overhead (~150-200ms saved when no knowledge)

**Remaining Limitation:**
- Bedrock LLM inference still takes ~2 seconds (unavoidable for LLM inference)
- This is inherent to AI inference, not a bug

---

### Issue #5: Text Field Repeating on Loops (CURRENT ISSUE ⚠️)
**Problem:**
- After AI responds, flow loops back to "Get customer input" block
- Text field plays again: "How can I help you?" (or whatever greeting is in Text field)
- Annoying repetition on every loop

**Root Cause:**
- "Get customer input" block's Text field plays every time the block is reached
- No conditional logic to prevent playing on subsequent loops
- Text field is static, doesn't check if greeting was already played

**Current Status:**
- Lambda sets `first_turn_complete: 'true'` after first interaction
- Connect flow needs to check this attribute and conditionally set Text field
- Solution requires adding "Check contact attributes" block before "Get customer input"

**Recommended Solution:**
- Add "Check contact attributes" block that checks `$.Lex.SessionAttributes.first_turn_complete`
- If `true` (subsequent turns): Route to "Get customer input" with Text = space ` `
- If `false` (first turn): Route to "Get customer input" with Text = greeting
- OR: Set Text field to space ` ` and let Lambda handle all greetings (but causes 5-second delay on first connection)

---

### Issue #6: 5-Second Delay at Start (CURRENT ISSUE ⚠️)
**Problem:**
- When Text field is blank (space), there's ~5 seconds of silence when call connects
- Caller hears nothing, then Lambda is invoked with empty input, then greeting plays
- Poor user experience

**Root Cause:**
- Text field needs to play greeting immediately on first connection
- But if Text field has greeting, it plays on every loop (Issue #5)
- Catch-22: Need greeting for no delay, but greeting causes repetition

**Current Solution Attempt:**
- Put greeting in Text field → Instant greeting but repeats on loops
- Put space in Text field → No repetition but 5-second delay

**Ideal Solution:**
- Use dynamic Text field based on `first_turn_complete` session attribute
- First turn: Text field = greeting (instant, no delay)
- Subsequent turns: Text field = space (no repetition)
- Requires conditional logic in Connect flow (Check block)

---

### Issue #7: No Call Termination (RESOLVED ✅)
**Problem:**
- When AI asks "Will that be all?" and user says "yes" or "that's all", call doesn't end
- Flow loops back asking "Is there anything else I can help you with?" again
- No way to properly end the call

**Root Cause:**
- Lambda wasn't detecting termination responses
- No logic to check if user confirms they're done after AI asks termination question

**Solution:**
- Added termination detection patterns: "yes", "that's all", "no thanks", "all set", "we're good", "I'm done", etc.
- Checks if last assistant message contained termination question before allowing termination
- Returns proper closing message: "Thank you for calling [Company]. Have a great day!"
- Sets `call_complete: 'true'` in session attributes
- Updated Bedrock system prompt to ask "Will that be all?" after answering (once per conversation)

---

## ✅ Fixes Applied

### Lambda Function Changes (`packages/lambda/call-orchestrator/src/index.ts`)

1. **First Turn Detection Logic:**
   ```typescript
   // Fixed: Check first_turn_complete flag FIRST, not just history
   const firstTurnComplete = sessionAttributes['first_turn_complete'] === 'true';
   const isFirstTurn = !firstTurnComplete && history.length === 0;
   ```

2. **Greeting Handling:**
   - Fast template greeting for empty input on first turn (no Bedrock call)
   - NEVER adds greeting prefix when user has already spoken
   - Aggressive greeting stripping with `stripGreetings()` function

3. **Post-Processing:**
   - Strips common greeting patterns: "Hello", "Hi", "I'm [name]", "This is [name]", etc.
   - Double-checks response after Bedrock generation
   - Multiple regex patterns for different greeting variations

4. **Call Termination:**
   - Detects termination responses after AI asks "will that be all?"
   - Returns proper closing message and marks call as complete

5. **Performance Optimizations:**
   - Quick check before RAG retrieval (skip if no knowledge chunks)
   - Reduced max_tokens: 300 → 200
   - Optimized system prompt (shorter)
   - Filter RAG chunks by similarity > 0.5

### Bedrock Service Changes (`packages/lambda/call-orchestrator/src/services/bedrock.service.ts`)

1. **System Prompt Updates:**
   - VERY explicit instructions to NEVER greet or introduce
   - Examples of wrong vs correct responses
   - Instruction to ask "Will that be all?" after answering (once per conversation)

2. **History Always Passed:**
   - Always passes conversation history to Bedrock
   - Bedrock knows context and won't greet if history exists

### RAG Service Optimizations (`packages/lambda/call-orchestrator/src/services/rag.service.ts`)

1. **Quick Check Before Embedding:**
   - Checks if knowledge chunks exist (Limit 1 scan)
   - Skips embedding generation if no chunks (~150-200ms saved)

2. **Similarity Filtering:**
   - Only includes chunks with similarity > 0.5
   - More relevant context, slightly faster

---

## 🔄 Current Flow Architecture

### Amazon Connect Contact Flow

```
1. Call Connects
   ↓
2. [Set Contact Attributes] - Set company_id, phone numbers
   ↓
3. [Connect to Lex] - ConnectParticipantWithLexBot block
   ↓
4. [Get Customer Input] - Lex handles speech recognition
   ├─ Text field: Currently set to greeting (causes repetition issue)
   ├─ Lex Session Attributes: Pass company_id, phone numbers, contactId
   └─ Invokes Lambda code hook
   ↓
5. [Lambda Function] - Handles AI logic
   ├─ Checks if first turn (empty input + first_turn_complete not set)
   ├─ If first turn: Returns fast template greeting
   ├─ If user has input: Generates Bedrock response
   ├─ Strips any greetings from Bedrock response
   ├─ Returns response with Close action
   └─ Sets first_turn_complete: 'true' in session attributes
   ↓
6. [Response] - Lex speaks the response
   ↓
7. [LOOP BACK] - Returns to "Get Customer Input" (Issue #5: Text field plays again)
```

### Lambda Function Flow (`handleGenAIResponse`)

```
1. Check if empty input on first turn
   ├─ Yes: Return fast template greeting, set first_turn_complete: 'true'
   └─ No: Continue
   
2. Check for call termination (user says "yes" after AI asks "will that be all?")
   ├─ Yes: Return closing message, set call_complete: 'true'
   └─ No: Continue
   
3. Load company, agent config, contact, create call record
   
4. Retrieve RAG context (optimized - skip if no knowledge)
   
5. Get conversation history from session attributes
   
6. Generate Bedrock response (pass history so Bedrock knows context)
   
7. Strip any greetings from response (aggressive cleanup)
   
8. NEVER add greeting prefix if user has already spoken
   
9. Update history and session attributes (set first_turn_complete: 'true')
   
10. Return response with Close action
```

---

## 🔧 Lambda Function Logic Details

### Session Attributes Used

- `company_id`: Company identifier (set by Connect flow)
- `customerPhoneNumber`: Caller's phone number
- `systemPhoneNumber`: Business phone number
- `contactId`: Connect contact ID
- `history`: JSON string of conversation history `[{role: 'user', content: '...'}, ...]`
- `first_turn_complete`: 'true' if greeting was already played (prevents re-greeting)
- `call_complete`: 'true' if call should terminate (set on termination detection)
- `last_confidence`: Last response confidence score

### First Turn Detection Logic

```typescript
// CRITICAL: Check first_turn_complete FIRST
const firstTurnComplete = sessionAttributes['first_turn_complete'] === 'true';
const isFirstTurn = !firstTurnComplete && history.length === 0;

// If empty input on first turn → return fast template greeting
if ((!input || input.trim() === '') && isFirstTurn) {
  return greeting; // Fast, no Bedrock call
}

// If user has input → NEVER add greeting (greeting was already played)
// Just respond directly
```

### Greeting Stripping Patterns

```typescript
// Patterns detected and stripped:
- "Hello", "Hi", "Hey" (with/without punctuation)
- "I'm [name]" (e.g., "I'm Sarah")
- "This is [name]"
- "Thanks for calling [company]"
- "Hello, I'm [name]"
- "Hi! I'm [name]"
- Combinations like "Hello, I'm Sarah. We offer..."
```

### Termination Detection

```typescript
// Termination patterns:
- "yes", "yeah", "yep", "sure", "ok", "okay"
- "that's all", "that's it", "nothing else"
- "no thanks", "no thank you"
- "all set", "we're good", "we're done"
- "I'm good", "I'm done", "nothing more", "done"

// Only triggers if:
1. User response matches termination pattern AND
2. Last AI message contained: "will that be all", "anything else", etc.
```

---

## ⚠️ Remaining Issues

### Issue A: Text Field Repetition on Loops (ACTIVE)
**Current State:**
- Text field in "Get customer input" plays on every loop
- Causes "How can I help you?" to repeat after every AI response

**Root Cause:**
- No conditional logic in Connect flow to check if greeting was already played
- Text field is static, doesn't adapt based on conversation state

**Required Fix:**
- Add "Check contact attributes" block before "Get customer input"
- Check `$.Lex.SessionAttributes.first_turn_complete`
- Route to different "Get customer input" blocks with different Text values
- OR: Use dynamic Text field expression (if supported by Connect)

**Workaround:**
- Set Text field to space ` ` (prevents repetition but causes 5-second delay)

---

### Issue B: 5-Second Delay on First Connection (ACTIVE)
**Current State:**
- When Text field is blank/space, there's ~5 second delay before greeting
- Lambda needs to be invoked with empty input first, then returns greeting

**Root Cause:**
- Text field doesn't play greeting immediately
- Lambda invocation adds latency
- Even with fast template greeting, ~2-3 second delay remains

**Required Fix:**
- Use conditional Text field based on `first_turn_complete`
- First turn: Text = greeting (instant, no delay)
- Subsequent turns: Text = space (no repetition)
- Requires Connect flow conditional logic

**Trade-off:**
- If Text field has greeting → Instant greeting but repeats on loops
- If Text field is blank → No repetition but 5-second delay
- Need dynamic Text field to have both benefits

---

### Issue C: Bedrock Response Latency (~2 seconds)
**Current State:**
- Bedrock LLM calls take ~2.3 seconds (measured)
- This is inherent to LLM inference, not a bug
- Makes conversation feel slow

**Why Unavoidable:**
- Claude 3.5 Sonnet inference takes ~2 seconds on AWS Bedrock
- This is normal for high-quality LLM inference
- Can't be optimized further without compromising quality

**Possible Solutions (Future):**
1. Use Claude Haiku (faster, ~1 second, but less capable)
2. Response caching for common questions
3. Streaming responses (start speaking while generating)
4. Connection pooling/optimization (minor gains)

---

## 📝 Manual Configuration Steps Required

### Step 1: Fix Text Field Repetition (REQUIRED)

**Option A: Add Conditional Check Block (RECOMMENDED)**

1. In Amazon Connect Console → Contact Flow Editor
2. Add "Check contact attributes" block BEFORE "Get customer input"
3. Configure check:
   - **Use attribute**: `Lex`
   - **Select attribute**: `Session attributes`
   - **Attribute key**: `first_turn_complete`
   - **Condition**: `equals`
   - **Value**: `true`

4. Configure branches:
   - **True** (first_turn_complete = true = subsequent turns):
     - Route to "Get customer input" block
     - In that block, set Text field to space ` `
   - **False** (first_turn_complete not set = first turn):
     - Route to "Get customer input" block  
     - In that block, set Text field to: `Hello! Thanks for calling. I'm your AI assistant. How can I help you today?`

**Option B: Set Text Field to Space (QUICK FIX)**

1. In "Get customer input" block
2. Find "Enter text to be spoken" field
3. Select "Set manually"
4. Enter: ` ` (single space)
5. Save

**Result:** No repetition but 5-second delay on first connection

---

### Step 2: Verify Contact Flow Configuration

**Ensure these attributes are passed to Lex:**
- `company_id`: `$.Attributes.company_id`
- `customerPhoneNumber`: `$.CustomerEndpoint.Address`
- `systemPhoneNumber`: `$.SystemEndpoint.Address`
- `contactId`: `$.ContactId`

**Ensure Lex Bot:**
- Uses Lambda code hook
- Code hook invoked on every intent
- Session attributes preserved between turns

---

## 🔍 Technical Details

### Lambda Function Location
- **Function Name**: `handycall-call-orchestrator`
- **Runtime**: Node.js 18+
- **Handler**: `index.handler`
- **Region**: `us-east-1`
- **Deployment**: Via `scripts/deploy-orchestrator.ps1`

### Bedrock Configuration
- **Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Embedding Model**: `amazon.titan-embed-text-v1`
- **Max Tokens**: 200 (optimized from 300)
- **Temperature**: 0.7

### DynamoDB Tables Used
- `handycall_prod_companies` - Company info
- `handycall_prod_agent_configs` - AI agent configuration
- `handycall_prod_contacts` - Contact/lead info
- `handycall_prod_calls` - Call records
- `handycall_prod_knowledge_chunks` - RAG knowledge base

### Performance Metrics
- **First turn greeting (empty input)**: ~200-300ms (fast template)
- **Bedrock LLM call**: ~2.0-2.5 seconds (inherent to inference)
- **RAG retrieval (no knowledge)**: ~150-200ms saved (optimized)
- **RAG retrieval (with knowledge)**: ~300-500ms (embedding + similarity)
- **Total response time**: ~2.3-2.8 seconds (dominated by Bedrock)

---

## 🎯 Recommendations for Review

### Architecture Decisions to Evaluate

1. **Lex-First Pattern:**
   - Pros: Lex handles speech recognition well, integrates with Connect
   - Cons: Adds latency layer, complex session attribute management
   - **Question**: Is direct Lambda invocation from Connect better?

2. **Greeting Strategy:**
   - Current: Lambda provides greeting on first turn with empty input
   - Alternative: Text field provides greeting, Lambda never greets
   - **Question**: Which is better for UX and latency?

3. **Text Field Management:**
   - Current: Static Text field causes repetition
   - Needed: Dynamic Text field based on session state
   - **Question**: Should Connect flow or Lambda handle Text field logic?

4. **Response Latency:**
   - Current: ~2.3 seconds per response (Bedrock inference)
   - Acceptable: Most AI voice assistants have similar latency
   - **Question**: Is this acceptable or should we use faster model?

### Areas for Improvement

1. **Connect Flow Complexity:**
   - Current flow has conditional routing issues
   - **Suggestion**: Simplify flow or move logic to Lambda

2. **Session Attribute Management:**
   - Multiple session attributes to track state
   - **Suggestion**: Consolidate or document attribute lifecycle

3. **Error Handling:**
   - Limited error handling for edge cases
   - **Suggestion**: Add fallback responses for common failures

4. **Testing:**
   - No automated tests for conversation flow
   - **Suggestion**: Add integration tests for common scenarios

---

## 📊 Issue Status Summary

| Issue | Status | Severity | Solution Required |
|-------|--------|----------|-------------------|
| Infinite greeting loop | ✅ Resolved | High | Lambda + Contact flow fix |
| "Speak/speak" prompt | ✅ Resolved | Medium | Text field fix |
| Reintroduction on every turn | ✅ Resolved | High | Aggressive greeting stripping |
| Slow response times | ⚠️ Partially | Medium | Optimizations applied, Bedrock latency inherent |
| Text field repetition | ⚠️ Active | High | Connect flow conditional logic |
| 5-second delay at start | ⚠️ Active | Medium | Dynamic Text field or conditional block |
| No call termination | ✅ Resolved | Medium | Termination detection added |

---

## 🚀 Next Steps

1. **Immediate Priority:** Fix Text field repetition (Issue A)
   - Add "Check contact attributes" block in Connect flow
   - Implement conditional routing based on `first_turn_complete`

2. **Secondary Priority:** Fix 5-second delay (Issue B)
   - Implement dynamic Text field or use conditional block
   - Ensure greeting plays instantly on first connection

3. **Future Consideration:** Response latency (Issue C)
   - Evaluate if 2-second latency is acceptable
   - Consider faster model (Haiku) if needed
   - Implement response caching if appropriate

---

## 📞 Key Files Reference

- **Lambda Handler**: `packages/lambda/call-orchestrator/src/index.ts`
- **Bedrock Service**: `packages/lambda/call-orchestrator/src/services/bedrock.service.ts`
- **RAG Service**: `packages/lambda/call-orchestrator/src/services/rag.service.ts`
- **Deployment Script**: `scripts/deploy-orchestrator.ps1`
- **Contact Flow**: Amazon Connect Console (no file, configured in UI)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-10
**Status**: Active Issues Requiring Connect Flow Configuration
