import { Context } from 'aws-lambda';
import { BedrockService } from './services/bedrock.service';
import { DynamoDBService } from './services/dynamodb.service';
import { RAGService } from './services/rag.service';
import { Company, AgentConfig, Contact, Call } from './types/connect.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lex V2 Event Structure (Code Hook)
 * Handles both Dialog Code Hook and Fulfillment Code Hook events
 */
interface LexV2Event {
  sessionId: string;
  invocationSource?: string; // 'DialogCodeHook' or 'FulfillmentCodeHook'
  bot: {
    name: string;
    aliasName: string;
    id: string;
    aliasId: string;
    version: string;
  };
  inputTranscript?: unknown;
  rawInputTranscript?: unknown;
  interpretations: Array<{
    intent: {
      name: string;
      slots: any;
      confirmationState: string;
      state: string;
    };
    nluConfidence: number;
  }>;
  sessionState: {
    sessionAttributes: Record<string, string>;
    dialogAction: {
      type: string;
    };
    intent: {
      name: string;
      state: string;
      slots?: any;
    };
  };
  requestAttributes?: Record<string, string>;
}

/**
 * Lex V2 Response Structure
 */
interface LexV2Response {
  sessionState: {
    sessionAttributes: Record<string, string>;
    dialogAction: {
      type: string;
    };
    intent: {
      name: string;
      state: string;
      slots?: any;
    };
  };
  messages: Array<{
    contentType: string;
    content: string;
  }>;
}

type CollectedInfo = {
  service?: string;
  issue?: string;
  name?: string;
  zip?: string;
  address?: string;
  preferredDayTime?: string;
};

/**
 * Helper: Wrap text in minimal SSML
 * CHANGE: Removed auto-breaths and prosody to let Generative/Neural engine handle natural flow
 * These tags add latency and fight against modern voice engines
 */
function wrapInSSML(text: string): string {
  return `<speak>${text}</speak>`;
}

function safeJsonParse<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function coerceTranscript(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    const current = (value as any).Current;
    if (typeof current === 'string') return current;
    if (current == null) return '';
  }
  return String(value);
}

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeQuestion(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (t.includes('?')) return true;
  return /^(what|how|when|where|why|who|do you|can you|are you|is it|does|will|would|should)\b/i.test(t);
}

function extractZip(text: string): string | undefined {
  const direct = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (direct?.[1]) return direct[1];

  const digits = (text.match(/\d/g) || []).join('');
  if (digits.length >= 5) return digits.slice(-5);

  const spokenDigits = extractDigitsFromSpeech(text);
  if (spokenDigits.length >= 5) return spokenDigits.slice(-5);

  return undefined;
}

function extractName(text: string): string | undefined {
  const m = text.match(/\b(?:my name is|this is)\s+([a-z]+(?:\s+[a-z]+){0,2})\b/i);
  const name = m?.[1]?.trim();
  if (!name) return undefined;
  if (name.length < 2) return undefined;
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function extractDigitsFromSpeech(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) return '';

  const map: Record<string, string> = {
    zero: '0',
    oh: '0',
    o: '0',
    one: '1',
    won: '1',
    two: '2',
    to: '2',
    too: '2',
    three: '3',
    tree: '3',
    four: '4',
    for: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    ate: '8',
    nine: '9',
  };

  const tokens = normalized.split(' ');
  const digits: string[] = [];

  for (const token of tokens) {
    if (!token) continue;
    if (/^\d+$/.test(token)) {
      digits.push(token);
      continue;
    }
    const mapped = map[token];
    if (mapped) digits.push(mapped);
  }

  return digits.join('');
}

function extractPreferredDayTime(text: string): string | undefined {
  const lower = text.toLowerCase();
  const hasDay =
    /\b(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?|today|tomorrow|next week)\b/i.test(
      lower,
    );
  const hasTime = /\b(\d{1,2}(:\d{2})?\s*(am|pm))\b/i.test(lower) || /\b(morning|afternoon|evening)\b/i.test(lower);
  if (!hasDay && !hasTime) return undefined;
  return text.trim().replace(/\s+/g, ' ');
}

function detectService(text: string): string | undefined {
  const t = normalizeText(text);
  const services: Array<[RegExp, string]> = [
    [/\bplumb(ing|er)?\b/, 'plumbing'],
    [/\belectric(al)?\b/, 'electrical'],
    [/\bpest\b|\bexterminat(e|ion)\b|\bbug(s)?\b/, 'pest control'],
    [/\bhvac\b|\bair conditioning\b|\bac\b|\bheating\b|\bfurnace\b/, 'hvac'],
    [/\broof(ing)?\b/, 'roofing'],
    [/\blocksmith\b|\blocks?\b/, 'locksmith'],
    [/\blawn\b|\blandscap(e|ing)\b/, 'lawn care'],
    [/\bclean(ing)?\b|\bmaid\b/, 'cleaning'],
  ];
  for (const [re, svc] of services) {
    if (re.test(t)) return svc;
  }
  return undefined;
}

function isRealtimeCacheCompatible(response: string, collected: CollectedInfo): boolean {
  const r = normalizeText(response);
  if (!r) return false;

  const needsZipOrAddress = !collected.zip && !collected.address;
  const needsName = !collected.name;
  const needsPreferredTime = !collected.preferredDayTime;
  const needsService = !collected.service;

  if (/\b(zip|address)\b/.test(r)) return needsZipOrAddress;
  if (/\b(name)\b/.test(r)) return needsName;
  if (/\b(day|time|when)\b/.test(r)) return needsPreferredTime;
  if (/\b(service|services)\b/.test(r)) return needsService;

  // Cache is only meant to short-circuit common, deterministic "next-step" prompts.
  return false;
}

function extractIssue(text: string, knownService?: string): string | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = normalizeText(t);
  if (/^(yes|yeah|yep|yup|no|nope|nah|ok|okay|thanks?|thank you)$/i.test(n)) return undefined;
  if (!knownService) return undefined;

  // Don't treat scheduling/contact details as an "issue".
  if (extractZip(t)) return undefined;
  if (detectAddress(t)) return undefined;
  if (extractPreferredDayTime(t)) return undefined;
  if (extractName(t)) return undefined;
  if (/\b(zip|zipcode|postal|address)\b/i.test(t)) return undefined;
  if (extractDigitsFromSpeech(t).length >= 5) return undefined;

  // If they mention a symptom/problem, treat the whole utterance as the issue description.
  const issueKeywords = /\b(leak|burst|clog|drain|backed up|no hot water|water heater|toilet|sink|faucet|pipe|smell|gas|outlet|breaker|sparks|roach|ant|termite|mosquito|wasp|mice|rat)\b/i;
  const looksLikeGenericServiceRequest =
    /\b(need|want)\s+(help|service|services)\b/i.test(t) ||
    /\bneed help with\b/i.test(t) ||
    /\bservices?\b/i.test(t) ||
    /\blooking for\b/i.test(t);

  if (issueKeywords.test(t)) return t.replace(/\s+/g, ' ');
  if (looksLikeGenericServiceRequest) return undefined;
  if (t.split(/\s+/).length >= 6) return t.replace(/\s+/g, ' ');
  return undefined;
}

function detectAddress(text: string): string | undefined {
  const t = text.trim();
  if (!t) return undefined;
  // Simple heuristic: starts with number and contains a street-type word.
  if (!/^\d{1,6}\s+\w+/i.test(t)) return undefined;
  if (!/\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd|way|court|ct)\b/i.test(t)) return undefined;
  return t.replace(/\s+/g, ' ');
}

function updateCollectedInfo(sessionAttributes: Record<string, string>, input: string): CollectedInfo {
  const collected = safeJsonParse<CollectedInfo>(sessionAttributes['collected_info'], {});
  const service = detectService(input) || collected.service;
  const name = extractName(input) || collected.name;
  const zip = extractZip(input) || collected.zip;
  const address = detectAddress(input) || collected.address;
  const preferredDayTime = extractPreferredDayTime(input) || collected.preferredDayTime;
  const issue = extractIssue(input, service) || collected.issue;

  // Heuristic: if issue already contains a concrete location/detail, consider it clarified.
  if (issue) {
    const looksSpecific =
      /\b(under|behind|next to|in the|at the)\b/i.test(issue) ||
      /\b(sink|toilet|shower|tub|faucet|water heater|heater|pipe|drain|outlet|breaker|panel|attic|kitchen|bath(room)?|garage)\b/i.test(
        issue,
      ) ||
      /\b(ant|ants|roach|roaches|termite|termites|mosquito|mosquitoes|wasp|wasps|mice|rats?)\b/i.test(issue);
    if (looksSpecific) sessionAttributes['issue_clarified'] = 'true';
  }

  const updated: CollectedInfo = {
    service,
    issue,
    name,
    zip,
    address,
    preferredDayTime,
  };

  sessionAttributes['collected_info'] = JSON.stringify(updated);
  return updated;
}

function needsMoreDetails(collected: CollectedInfo): { next: string | null; stage: string } {
  if (!collected.service) return { next: 'What service do you need help with?', stage: 'intake' };
  if (!collected.issue) {
    return { next: `Got it - what's going on with the ${collected.service}?`, stage: 'clarify' };
  }
  if (!collected.name) return { next: "Got it - what's your name?", stage: 'schedule' };
  if (!collected.zip && !collected.address) return { next: "What's your zip code or address?", stage: 'schedule' };
  if (!collected.preferredDayTime) return { next: 'What day and time works best?', stage: 'schedule' };
  return { next: null, stage: 'confirm' };
}

/**
 * Main Lambda handler - Lex V2 Code Hook
 * This is called by Lex when FallbackIntent is matched
 * Also handles Connect direct invocations (for backwards compatibility)
 */
export const handler = async (event: any, context: Context): Promise<any> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Warmup invocation (EventBridge schedule) to reduce cold-start latency.
  if (event?.warm === true) {
    return { ok: 'true', warmedAt: new Date().toISOString() };
  }

  // Detect event type
  const isLexV2Event = event.sessionState !== undefined && event.sessionState.intent !== undefined;
  const isConnectEvent = event.Details !== undefined;
  const isDialogCodeHook = event.invocationSource === 'DialogCodeHook';
  const isFulfillmentCodeHook = event.invocationSource === 'FulfillmentCodeHook';

  if (isConnectEvent) {
    console.log('Received Connect event - handling for backwards compatibility');
    console.log('   The Contact Flow should use ConnectParticipantWithLexBot for best results');

    // Handle Connect events gracefully for backwards compatibility
    const userInput = coerceTranscript(event.Details?.Parameters?.UserInput);
    const contactData = event.Details?.ContactData || {};

    // Merge useful ContactData fields into a sessionAttributes-like map so the rest of the pipeline works.
    // This is required for Connect flows that invoke Lambda directly (without Lex session attributes).
    const mergedSessionAttributes: Record<string, string> = {
      ...(event.Details?.Parameters || {}),
      ...(contactData.Attributes || {}),
    };

    if (!mergedSessionAttributes.contactId && contactData.ContactId) {
      mergedSessionAttributes.contactId = contactData.ContactId;
    }
    if (!mergedSessionAttributes.systemPhoneNumber && contactData.SystemEndpoint?.Address) {
      mergedSessionAttributes.systemPhoneNumber = contactData.SystemEndpoint.Address;
    }
    if (!mergedSessionAttributes.customerPhoneNumber && contactData.CustomerEndpoint?.Address) {
      mergedSessionAttributes.customerPhoneNumber = contactData.CustomerEndpoint.Address;
    }

    // If no user input, return a greeting
    if (!userInput || userInput.trim() === '') {
      const greetingText = 'Hello! How can I help you today?';
      return {
        response: wrapInSSML(greetingText),
        timestamp: new Date().toISOString(),
      };
    }

    // If there is user input, process it through the GenAI pipeline
    try {
      const result = await handleGenAIResponse(userInput, mergedSessionAttributes, event);

      // Extract the response text from Lex response format
      const responseText = result.messages && result.messages.length > 0
        ? result.messages[0].content
        : wrapInSSML("I'm sorry, I couldn't process that request.");

      return {
        response: responseText,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error handling Connect event:', error);
      return {
        response: wrapInSSML("Sorry - I'm having trouble right now. Please try again in a moment."),
        timestamp: new Date().toISOString(),
      };
    }
  }

  if (!isLexV2Event) {
    console.error('Unknown event type:', Object.keys(event));
    console.error('Event structure:', JSON.stringify(event, null, 2));
    throw new Error('Invalid event type - expected Lex V2 event');
  }

  console.log(`Invocation source: ${event.invocationSource || 'not specified'}`);
  console.log(`Is Dialog Code Hook: ${isDialogCodeHook}, Is Fulfillment Code Hook: ${isFulfillmentCodeHook}`);

  const lexEvent = event as LexV2Event;
  const intentName = lexEvent.sessionState.intent.name;
  const sessionAttributes = lexEvent.sessionState.sessionAttributes || {};
  const inputTranscript =
    coerceTranscript(lexEvent.inputTranscript) || coerceTranscript(lexEvent.rawInputTranscript);

  console.log(`Intent: ${intentName}, Transcript: "${inputTranscript}"`);
  console.log(`Session attributes:`, JSON.stringify(sessionAttributes, null, 2));

  // Handle FallbackIntent and FreeConversationIntent (GenAI catch-all)
  if (intentName === 'FallbackIntent' || intentName === 'QnAIntent' || intentName === 'FreeConversationIntent') {
    return await handleGenAIResponse(inputTranscript, sessionAttributes, lexEvent);
  }

  // Handle ClearContext or explicit commands
  if (intentName === 'ClearContext') {
    return close(lexEvent.sessionState, 'Context cleared. How can I help you?');
  }

  // Default: Delegate back to Lex if we don't know what to do
  return delegate(lexEvent.sessionState);
};

/**
 * Handle GenAI Response (FallbackIntent)
 */
async function handleGenAIResponse(
  inputRaw: unknown,
  sessionAttributes: Record<string, string>,
  event: LexV2Event | any
): Promise<LexV2Response> {
  const input = coerceTranscript(inputRaw);
  // Check if this is the first turn (no conversation history AND first_turn_complete not set)
  const historyValue = sessionAttributes['history'];
  const historyParsed = safeJsonParse<any>(historyValue, []);
  const history = Array.isArray(historyParsed) ? historyParsed : [];
  const firstTurnComplete = sessionAttributes['first_turn_complete'] === 'true';
  const isFirstTurn = history.length === 0 && !firstTurnComplete;

  // CRITICAL: Do NOT generate greeting from Lambda - the Connect flow Text field handles it
  // If we receive empty input on first turn, just delegate back to Lex
  // This prevents duplicate/overlapping greetings
  if ((!input || input.trim() === '') && isFirstTurn) {
    console.log('First turn with empty input - delegating to Lex (greeting handled by Connect flow Text field)');

    // Mark first turn as complete to prevent re-greeting
    const updatedSessionAttributes = {
      ...sessionAttributes,
      first_turn_complete: 'true',
    };

    return {
      sessionState: {
        sessionAttributes: updatedSessionAttributes,
        dialogAction: {
          type: 'ElicitIntent',
        },
        intent: {
          name: 'FallbackIntent',
          state: 'InProgress',
        },
      },
      messages: [],
    };
  }

  // If input is empty and not first turn, delegate back to Lex to handle reprompt
  if (!input || input.trim() === '') {
    console.log('Empty input on subsequent turn, delegating to Lex');
    return delegate(event.sessionState);
  }

  // Update collected info from this turn (service/issue/zip/time/name/etc)
  const collected = updateCollectedInfo(sessionAttributes, input);

  // Get conversation history early to check for termination (before loading company/agent)
  const historyForTerminationCheck = sessionAttributes['history']
    ? (() => {
        try {
          return JSON.parse(sessionAttributes['history']);
        } catch (e) {
          return [];
        }
      })()
    : [];

  // Call wrap-up handling:
  // - If we asked "Anything else?" then "no" means wrap up, "yes" means continue.
  // - If we asked "Will that be all?" then "yes" means wrap up, "no" means continue.
  const normalizedInput = input.trim().toLowerCase();
  const lastAssistantMessage =
    historyForTerminationCheck.length > 0
      ? historyForTerminationCheck.filter((h: any) => h.role === 'assistant').pop()?.content || ''
      : '';

  const awaitingAnythingElse = sessionAttributes['awaiting_anything_else'] === 'true';
  const askedAnythingElse =
    awaitingAnythingElse ||
    /(?:anything else|need help with anything else|is there anything else|anything more|something else)/i.test(
      lastAssistantMessage,
    );
  const askedWillThatBeAll = /(?:will that be all|is that all|all set|all good)/i.test(lastAssistantMessage);

  const isYes =
    /^(yes|yeah|yep|yup|sure|ok|okay|correct|right|mm[\s-]?hmm|uh[\s-]?huh)$/i.test(normalizedInput) ||
    /^(yes|yeah|yep|yup|sure|ok|okay)[,!\s]+/i.test(normalizedInput);
  const isNo =
    /^(no|nope|nah|not really|that's all|thats all|that's it|thats it|nothing else|no thanks|no thank you|all set|we're good|we are good|we're done|we are done|i'm good|im good|i'm done|im done|done|no more)$/i.test(
      normalizedInput,
    ) || /^(no|nope|nah)[,!\s]+/i.test(normalizedInput);

  const shouldWrapUp = (askedAnythingElse && isNo) || (askedWillThatBeAll && isYes);
  const shouldContinue = (askedAnythingElse && isYes) || (askedWillThatBeAll && isNo);

  if (shouldWrapUp) {
    console.log('Call wrap-up detected - ending call');
    
    try {
      // Quick company lookup for closing message
      const companyId = sessionAttributes['company_id'] || '';
      let companyName = '';
      if (companyId) {
        try {
          const companyData = await DynamoDBService.get('companies', { company_id: companyId });
          companyName = (companyData as Company)?.company_name || '';
        } catch (error) {
          console.warn('Could not get company for termination message');
        }
      }
      
      const closingMessage = companyName
        ? `All set. Thanks for calling ${companyName}. Goodbye.`
        : 'All set. Thanks for calling. Goodbye.';

      // Update session to mark call as complete
      const updatedSessionAttributes = {
        ...sessionAttributes,
        first_turn_complete: 'true',
        call_complete: 'true',
        awaiting_anything_else: 'false',
      };

      // Return Close with Goodbye intent so the Connect flow can disconnect immediately.
      return {
        sessionState: {
          sessionAttributes: updatedSessionAttributes,
          dialogAction: {
            type: 'Close',
          },
          intent: {
            name: 'Goodbye',
            state: 'Fulfilled',
          },
        },
        messages: [
          {
            contentType: 'SSML',
            content: wrapInSSML(closingMessage),
          },
        ],
      };
    } catch (error) {
      console.error('Error generating termination message:', error);
      return close(event.sessionState, 'Thanks for calling. Goodbye.', 'Goodbye');
    }
  }

  if (shouldContinue) {
    console.log('Call wrap-up detected - user wants more help');
    const updatedSessionAttributes = { ...sessionAttributes, awaiting_anything_else: 'false' };
    return {
      sessionState: {
        ...event.sessionState,
        sessionAttributes: updatedSessionAttributes,
        dialogAction: { type: 'Close' },
        intent: { name: event.sessionState.intent.name, state: 'Fulfilled' },
      },
      messages: [{ contentType: 'SSML', content: wrapInSSML("Sure - what else can I help with?") }],
    };
  }

  try {
    // A. Get company information from session attributes (set by Connect)
    const companyId = sessionAttributes['company_id'] || '';
    const customerPhone = sessionAttributes['customerPhoneNumber'] || '';
    const systemPhone = sessionAttributes['systemPhoneNumber'] || '';
    const contactId =
      sessionAttributes['contactId'] ||
      sessionAttributes['contactId'.toLowerCase()] ||
      event?.Details?.ContactData?.ContactId ||
      event?.sessionId ||
      '';

    console.log(`Processing GenAI request - Company: ${companyId}, Customer: ${customerPhone}`);

    // B. Lookup company (if company_id not in session, try phone lookup)
    let company: Company | null = null;
    if (companyId) {
      try {
        const companyData = await DynamoDBService.get('companies', { company_id: companyId });
        company = companyData as Company | null;
      } catch (error) {
        console.warn('Could not get company by ID, trying phone lookup');
      }
    }

    // If no company found by ID, try phone lookup
    if (!company && systemPhone) {
      company = await lookupCompanyByPhone(systemPhone);
    }

    if (!company) {
      console.error('Company not found');
      return close(
        event.sessionState,
        "I'm sorry, but I cannot process this call at the moment. Please try again later."
      );
    }

    console.log(`Found company: ${company.company_name} (${company.company_id})`);

    // C. Load agent configuration
    const agentConfig = await loadAgentConfig(company.company_id);
    if (!agentConfig) {
      return close(
        event.sessionState,
        "I'm sorry, but the service is not configured properly. Please contact support."
      );
    }

    // D. Find or create contact
    let contact: Contact | null = null;
    if (customerPhone) {
      contact = await findOrCreateContact(company.company_id, customerPhone);
      console.log(`Contact: ${contact.contact_id}`);
    }

    // E. Create or update call record
    if (contact && contactId) {
      await createOrUpdateCall(
        company.company_id,
        contact.contact_id,
        contactId,
        customerPhone,
        systemPhone
      );
      console.log(`Call record: ${contactId}`);
    }

    // F. Real-time cache check (precomputed by streaming processor)
    // If we have a fresh, matching cached response, we can skip RAG+Bedrock and respond immediately.
    let realtimeCache = await tryGetRealtimeCache(contactId, input);
    if (realtimeCache && !isRealtimeCacheCompatible(realtimeCache.response, collected)) {
      console.log(`Realtime cache ignored (stage mismatch) for contactId=${contactId}`);
      realtimeCache = null;
    }

    // G. Retrieve Context (RAG) - skip when cache hit
    const ragContext = realtimeCache
      ? []
      : await (async () => {
          console.log(`Retrieving knowledge for company: ${company.company_id}`);
          const ctx = await RAGService.retrieveRelevantKnowledge(company.company_id, input, 5);
          console.log(`Retrieved ${ctx.length} knowledge chunks`);
          return ctx;
        })();

    // G. Get conversation history from session attributes
    const history = sessionAttributes['history']
      ? (() => {
          try {
            return JSON.parse(sessionAttributes['history']);
          } catch (e) {
            console.warn('Error parsing history from session attributes, using empty array:', e);
            return [];
          }
        })()
      : [];

    // Check if this is the first turn
    // CRITICAL: Check first_turn_complete FIRST - if it's set, it's NOT first turn (even if history is empty)
    // IMPORTANT: If user has input, they already heard greeting from Text field (no delay) OR from Lambda on empty input
    const firstTurnComplete = sessionAttributes['first_turn_complete'] === 'true';
    const isFirstTurn = !firstTurnComplete && history.length === 0; // First turn ONLY if NOT complete AND no history
    const greetingAlreadyPlayed = (input && input.trim() !== '') || firstTurnComplete; // If user has input, greeting was already played
    
    const assistantName = agentConfig.ai_assistant_name || 'your AI assistant';

    console.log(`Turn check: history.length=${history.length}, first_turn_complete=${firstTurnComplete}, userHasInput=${!!input}, isFirstTurn=${isFirstTurn}, greetingAlreadyPlayed=${greetingAlreadyPlayed}`);
    if (firstTurnComplete && history.length === 0) {
      console.warn('WARNING: first_turn_complete is true but history is empty - treating as subsequent turn');
    }

    // H. Generate Response via Bedrock (or cache)
    let aiResult: { response: string; confidence: number; shouldFlag: boolean };

    if (realtimeCache) {
      console.log(`Realtime cache HIT for contactId=${contactId}`);
      aiResult = {
        response: realtimeCache.response,
        confidence: 100,
        shouldFlag: false,
      };
    } else {
      const questionLike = looksLikeQuestion(input);
      const issueClarified = sessionAttributes['issue_clarified'] === 'true';
      const awaitingIssueDetail = sessionAttributes['awaiting_issue_detail'] === 'true';

      // If we asked a clarification question last turn, treat this input as the clarification and append.
      if (awaitingIssueDetail && collected.issue && !questionLike) {
        const appended = `${collected.issue}; ${input}`.replace(/\s+/g, ' ').trim();
        collected.issue = appended;
        sessionAttributes['collected_info'] = JSON.stringify(collected);
        sessionAttributes['awaiting_issue_detail'] = 'false';
        sessionAttributes['issue_clarified'] = 'true';
      }

      // Ask one extra detail so the "noted down" info is useful (before scheduling).
      if (collected.service && collected.issue && !issueClarified && !awaitingIssueDetail && !questionLike) {
        const clarifier =
          collected.service === 'plumbing'
            ? 'Got it - where is the leak (sink, toilet, water heater, etc.)?'
            : collected.service === 'pest control'
              ? 'Got it - what pest are you seeing and where in the home?'
              : "Got it - what's the main issue you're noticing?";
        aiResult = { response: clarifier, confidence: 100, shouldFlag: false };
        sessionAttributes['awaiting_issue_detail'] = 'true';
        sessionAttributes['awaiting_anything_else'] = 'false';
      } else {
        // Deterministic intake/scheduling questions (fast + consistent). Allow Bedrock for question-like turns.
        const { next, stage } = needsMoreDetails(collected);

        if (next && !questionLike) {
          aiResult = { response: next, confidence: 100, shouldFlag: false };
          sessionAttributes['awaiting_anything_else'] = 'false';
        } else if (!next && stage === 'confirm' && !questionLike) {
          const where = collected.address ? collected.address : collected.zip ? `zip ${collected.zip}` : '';
          const when = collected.preferredDayTime || '';
          const who = collected.name || '';
          const what = collected.service || 'service';
          const issue = collected.issue || '';

          const summaryParts = [
            who ? `${who}` : '',
            what ? `${what}` : '',
            issue ? `(${issue})` : '',
            where ? `at ${where}` : '',
            when ? `- ${when}` : '',
          ].filter(Boolean);

          const summary = summaryParts.join(' ');
          aiResult = {
            response: `Perfect - I've got you noted: ${summary}. Anything else I can help with?`,
            confidence: 100,
            shouldFlag: false,
          };
          sessionAttributes['awaiting_anything_else'] = 'true';
        } else {
          aiResult = { response: '', confidence: 0, shouldFlag: false };
          sessionAttributes['awaiting_anything_else'] = 'false';
        }
      }
    }

    if (!realtimeCache) {
      // Generate AI response - pass FULL history so Bedrock knows context
      // Bedrock is instructed NOT to greet via system prompt
      if (aiResult.response) {
        console.log('Using deterministic intake response');
      } else {
        console.log(isFirstTurn ? 'First turn - generating response with greeting prefix' : 'Subsequent turn - responding without greeting');
        aiResult = await BedrockService.generateResponse(
          agentConfig,
          company.company_name,
          input,
          ragContext,
          history,
        );
      }
    }

    // Post-process response to strip any greetings Bedrock might have generated (safety net)
    // This ensures Bedrock never greets even if it ignores system prompt instructions
    aiResult.response = stripGreetings(aiResult.response, assistantName, company.company_name);

    // CRITICAL: NEVER add greeting prefix when user has already spoken (has input)
    // The Text field in Connect flow handles greeting on first connection
    // Lambda should only respond to what user asked - no greeting, no reintroduction
    // If user has input (even on first turn), they already heard greeting from Text field
    if (input && input.trim() !== '') {
      // User has spoken - NO greeting prefix ever
      console.log('User has spoken - responding without any greeting or introduction');
    } else {
      // Empty input on first turn is handled earlier - should never reach here
      console.log('Empty input case - should have been handled earlier');
    }
    
    // Ensure NO greeting is in response (double-check stripGreetings worked)
    // Check for common greeting patterns that might have slipped through
    const greetingCheck = aiResult.response.toLowerCase().match(/^(hello|hi|hey|thanks for calling|hello,|hi,|hey,)/);
    if (greetingCheck) {
      console.warn(`WARNING: Greeting pattern detected in response after stripGreetings: "${greetingCheck[0]}" - applying aggressive cleanup`);
      
      // Very aggressive stripping - remove everything up to and including first sentence if it contains greeting
      // Pattern: "Hello, I'm Sarah. [actual answer]" → extract "[actual answer]"
      const cleaned = aiResult.response
        .replace(/^(?:hello|hi|hey)[^.!]*[.!]\s*/i, '')
        .replace(/^hello[^.!]*[.!]\s*/i, '')
        .replace(/^hi[^.!]*[.!]\s*/i, '')
        .replace(/^hey[^.!]*[.!]\s*/i, '')
        .replace(/^thanks?\s+for\s+calling[^.!]*[.!]\s*/i, '')
        .trim();
      
      if (cleaned && cleaned.length > 5) {
        aiResult.response = cleaned;
        console.log('Applied aggressive greeting cleanup - response cleaned');
      } else {
        // If cleaning removed too much, try extracting after first period/comma
        const afterFirstPeriod = aiResult.response.split(/[.!]/).slice(1).join('.').trim();
        if (afterFirstPeriod && afterFirstPeriod.length > 5) {
          aiResult.response = afterFirstPeriod;
          console.log('Extracted response after first period/comma');
        }
      }
    }

    console.log(`Generated response with ${aiResult.confidence.toFixed(2)}% confidence`);

    // I. Create flagged question if low confidence
    if (aiResult.shouldFlag && contact && contactId) {
      await createFlaggedQuestion(
        company.company_id,
        contactId,
        contact.contact_id,
        input,
        aiResult.response,
        aiResult.confidence
      );
      console.log('Created flagged question due to low confidence');
    }

    // J. Update History (keep last 4 turns to save space)
    // Save response WITHOUT greeting (greeting is only from Text field on first connection)
    const responseToSave = aiResult.response; // Already has greeting stripped
    const newHistory = [
      ...history.slice(-4),
      { role: 'user', content: input },
      { role: 'assistant', content: responseToSave }, // Response without greeting
    ];

    // K. Update session attributes
    // CRITICAL: Mark first turn as complete if it was the first interaction
    // This prevents any future greetings or reintroductions
    // If user has spoken (input exists), this is definitely not first turn anymore (even if isFirstTurn was true)
    const updatedFirstTurnComplete = (isFirstTurn || (input && input.trim() !== '')) ? 'true' : (sessionAttributes['first_turn_complete'] || 'false');
    
    const updatedSessionAttributes = {
      ...sessionAttributes,
      company_id: company.company_id,
      history: JSON.stringify(newHistory),
      first_turn_complete: updatedFirstTurnComplete, // Always set properly - prevents re-greeting
      last_confidence: aiResult.confidence.toString(),
      customerPhoneNumber: customerPhone,
      systemPhoneNumber: systemPhone,
      contactId: contactId,
    };
    
    console.log(`Updated session: history.length=${newHistory.length}, first_turn_complete=${updatedFirstTurnComplete}`);

    // L. Return "Close" action with the message
    // This tells Lex: "We are done with this turn, speak this text."
    return {
      sessionState: {
        sessionAttributes: updatedSessionAttributes,
        dialogAction: {
          type: 'Close', // Close the specific intent, but Connect keeps the call open
        },
        intent: {
          name: event.sessionState.intent.name,
          state: 'Fulfilled',
        },
      },
      messages: [
        {
          contentType: 'SSML',
          content: wrapInSSML(aiResult.response),
        },
      ],
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return close(
      event.sessionState,
      "Sorry, I'm having a technical hiccup. Could you say that again?"
    );
  }
}

/**
 * Helper: Strip greetings from Bedrock response (safety net)
 * Removes common greeting patterns that Bedrock might generate despite instructions
 */
function stripGreetings(response: string, assistantName: string, companyName?: string): string {
  let cleaned = response.trim();
  const original = cleaned;
  
  // Extract assistant name parts for better matching
  const nameParts = assistantName.toLowerCase().split(/\s+/);
  const firstName = nameParts[0] || '';
  
  // Remove common greeting patterns at the start (avoid stripping useful content like "I'm not sure...")
  const greetingPatterns = [
    /^hello[,!]?\s*/i,
    /^hi[,!]?\s*/i,
    /^hey[,!]?\s*/i,
    /^thanks?\s+for\s+calling[^.]*[.!]?\s*/i,
    /^I'm\s+your\s+AI\s+assistant[^.]*[.!]?\s*/i,
    /^I'm\s+the\s+AI\s+assistant[^.]*[.!]?\s*/i,
    /^hello[^.!]*I'm[^.!]+[.!]?\s*/i, // Matches "Hello, I'm Sarah."
    /^hi[^.!]*I'm[^.!]+[.!]?\s*/i, // Matches "Hi, I'm Sarah."
  ];
  
  // Add name-specific patterns
  if (firstName) {
    greetingPatterns.push(
      new RegExp(`^I'm\\s+${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!]*[.!]?\\s*`, 'i'),
      new RegExp(`^hello[^.!]*I'm\\s+${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!]*[.!]?\\s*`, 'i'),
      new RegExp(`^hi[^.!]*I'm\\s+${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!]*[.!]?\\s*`, 'i')
    );
  }
  
  for (const pattern of greetingPatterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  
  // If still starts with greeting-like content, try to extract the actual answer
  // Look for patterns like "Hello, I'm Sarah. We offer..." or "I'm Sarah. We offer..."
  const greetingWithAnswer = cleaned.match(/^(?:hello|hi|hey|thanks\s+for\s+calling)[^.!]*[.!]\s*(.+)$/i);
  if (greetingWithAnswer && greetingWithAnswer[1]) {
    cleaned = greetingWithAnswer[1].trim();
  }
  
  // Final check: if response still looks like it starts with greeting, try to find first real sentence
  if (cleaned.toLowerCase().match(/^(hello|hi|hey|thanks\s+for\s+calling)/)) {
    // Split by periods and take everything after first sentence if it contains greeting words
    const sentences = cleaned.split(/[.!]+\s*/);
    if (sentences.length > 1 && sentences[0].toLowerCase().match(/(hello|hi|hey|thanks for calling)/)) {
      cleaned = sentences.slice(1).join('. ').trim();
    }
  }
  
  // If cleaning resulted in empty or too short response, return original
  // But still remove obvious greetings
  if (!cleaned || cleaned.length < 5) {
    // Last resort: just remove obvious greeting prefixes
    cleaned = original.replace(/^(?:hello|hi|hey|thanks for calling)[^.!]*[.!]?\s*/i, '').trim() || original;
  }
  
  return cleaned || response; // Return original if cleaning resulted in empty string
}

function normalizeForRealtimeCacheMatch(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tryGetRealtimeCache(
  contactId: string,
  input: string,
): Promise<{ transcript: string; response: string; updatedAt: number } | null> {
  try {
    if (!contactId || !input) return null;

    const item = await DynamoDBService.get('realtime_cache', { contact_id: contactId });
    if (!item?.response || !item?.transcript) return null;

    const updatedAt = Number(item.updated_at || 0);
    if (!updatedAt) return null;

    // Keep this window tight; the cache is only meant to bridge "Lex turn end" latency.
    const isFresh = Date.now() - updatedAt <= 20_000;
    if (!isFresh) return null;

    const cached = normalizeForRealtimeCacheMatch(item.transcript);
    const current = normalizeForRealtimeCacheMatch(input);
    if (!cached || !current) return null;

    const isMatch = cached === current || cached.includes(current) || current.includes(cached);
    if (!isMatch) return null;

    return {
      transcript: item.transcript,
      response: item.response,
      updatedAt,
    };
  } catch (error) {
    console.warn('Realtime cache lookup failed (ignored):', error);
    return null;
  }
}

/**
 * Helper: Delegate back to Lex
 */
function delegate(sessionState: any): LexV2Response {
  return {
    sessionState: {
      ...sessionState,
      dialogAction: {
        type: 'Delegate',
      },
    },
    messages: [],
  };
}

/**
 * Helper: Close intent with message
 */
function close(sessionState: any, message: string, intentNameOverride?: string): LexV2Response {
  return {
    sessionState: {
      ...sessionState,
      dialogAction: {
        type: 'Close',
      },
      intent: {
        name: intentNameOverride || sessionState.intent.name,
        state: 'Fulfilled',
      },
    },
    messages: [
      {
        contentType: 'SSML',
        content: wrapInSSML(message),
      },
    ],
  };
}

/**
 * Lookup company by AWS Connect phone number
 */
async function lookupCompanyByPhone(phoneNumber: string): Promise<Company | null> {
  try {
    // Try to query using connect-phone-index GSI
    try {
      const companies = await DynamoDBService.query(
        'companies',
        'connect_phone_number = :phone',
        { ':phone': phoneNumber },
        'connect-phone-index'
      );

      if (companies.length > 0) {
        return companies[0] as Company;
      }
    } catch (gsiError) {
      console.warn('GSI query failed, falling back to scan:', gsiError);
    }

    // Fallback: Scan the table if GSI doesn't exist yet
    const scanResult = await DynamoDBService.scan(
      'companies',
      'connect_phone_number = :phone',
      { ':phone': phoneNumber }
    );

    return scanResult.length > 0 ? (scanResult[0] as Company) : null;
  } catch (error) {
    console.error('Error looking up company by Connect phone:', error);
    return null;
  }
}

/**
 * Load agent configuration for a company
 */
async function loadAgentConfig(companyId: string): Promise<AgentConfig | null> {
  try {
    const config = await DynamoDBService.get('agent_configs', { company_id: companyId });

    // Return config or create default
    if (config) {
      return config as AgentConfig;
    }

    // Default configuration
    return {
      company_id: companyId,
      greeting_tone: 'professional',
      can_discuss_pricing: false,
      can_handle_emergencies: false,
      booking_mode: 'LEAD_CAPTURE',
      escalation_threshold: 70,
      max_conversation_turns: 10,
      languages: ['en'],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  } catch (error) {
    console.error('Error loading agent config:', error);
    return null;
  }
}

/**
 * Find or create a contact record
 */
async function findOrCreateContact(companyId: string, phoneNumber: string): Promise<Contact> {
  try {
    // Try to find existing contact
    const contacts = await DynamoDBService.query(
      'contacts',
      'company_id = :company_id AND phone_number = :phone',
      { ':company_id': companyId, ':phone': phoneNumber },
      'phone-lookup'
    );

    if (contacts.length > 0) {
      return contacts[0] as Contact;
    }

    // Create new contact
    const contactId = uuidv4();
    const now = Date.now();

    const newContact: Contact = {
      company_id: companyId,
      contact_id: contactId,
      phone_number: phoneNumber,
      lead_status: 'NEW',
      created_at: now,
      updated_at: now,
    };

    await DynamoDBService.put('contacts', {
      ...newContact,
      lead_status_created: `NEW#${now}`,
    });

    return newContact;
  } catch (error) {
    console.error('Error finding/creating contact:', error);
    throw error;
  }
}

/**
 * Create or update call record
 */
async function createOrUpdateCall(
  companyId: string,
  contactId: string,
  connectContactId: string,
  fromNumber: string,
  toNumber: string
): Promise<Call> {
  try {
    const now = Date.now();

    const call: Call = {
      company_id: companyId,
      call_id: connectContactId,
      contact_id: contactId,
      direction: 'INBOUND',
      from_number: fromNumber,
      to_number: toNumber,
      status: 'IN_PROGRESS',
      ai_handled: true,
      started_at: now,
      created_at: now,
      updated_at: now,
    };

    await DynamoDBService.put('calls', {
      ...call,
      company_contact: `${companyId}#${contactId}`,
      ai_handled_started: `true#${now}`,
    });

    return call;
  } catch (error) {
    console.error('Error creating call record:', error);
    throw error;
  }
}

/**
 * Create a flagged question for low-confidence responses
 */
async function createFlaggedQuestion(
  companyId: string,
  callId: string,
  contactId: string,
  question: string,
  aiAttemptedAnswer: string,
  confidenceScore: number
): Promise<void> {
  try {
    const flaggedId = uuidv4();
    const now = Date.now();

    await DynamoDBService.put('flagged_questions', {
      company_id: companyId,
      flagged_id: flaggedId,
      call_id: callId,
      contact_id: contactId,
      question: question,
      ai_attempted_answer: aiAttemptedAnswer,
      confidence_score: confidenceScore,
      status: 'OPEN',
      created_at: now,
      updated_at: now,
      status_created: `OPEN#${now}`,
    });
  } catch (error) {
    console.error('Error creating flagged question:', error);
    // Don't throw - this is not critical
  }
}
