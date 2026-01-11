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
  inputTranscript: string;
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

/**
 * Helper: Wrap text in SSML for more natural voice output
 */
function wrapInSSML(text: string): string {
  // Add SSML tags for better prosody
  // Use amazon:auto-breaths for more natural pauses
  // Use prosody for natural rate and pitch
  return `<speak>
    <amazon:auto-breaths>
      <prosody rate="medium" pitch="medium">
        ${text}
      </prosody>
    </amazon:auto-breaths>
  </speak>`;
}

/**
 * Main Lambda handler - Lex V2 Code Hook
 * This is called by Lex when FallbackIntent is matched
 * Also handles Connect direct invocations (for backwards compatibility)
 */
export const handler = async (event: any, context: Context): Promise<any> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Detect event type
  const isLexV2Event = event.sessionState !== undefined && event.sessionState.intent !== undefined;
  const isConnectEvent = event.Details !== undefined;
  const isDialogCodeHook = event.invocationSource === 'DialogCodeHook';
  const isFulfillmentCodeHook = event.invocationSource === 'FulfillmentCodeHook';

  if (isConnectEvent) {
    console.log('⚠️  Received Connect event - handling for backwards compatibility');
    console.log('   The Contact Flow should use ConnectParticipantWithLexBot for best results');

    // Handle Connect events gracefully for backwards compatibility
    const userInput = event.Details?.Parameters?.UserInput || '';

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
      const sessionAttributes = event.Details?.Parameters || {};
      const result = await handleGenAIResponse(userInput, sessionAttributes, event);

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
        response: wrapInSSML("I'm sorry, I'm having trouble right now. Please hold for an agent."),
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
  const inputTranscript = lexEvent.inputTranscript || '';

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
  input: string,
  sessionAttributes: Record<string, string>,
  event: LexV2Event | any
): Promise<LexV2Response> {
  // Check if this is the first turn (no conversation history AND first_turn_complete not set)
  const history = sessionAttributes['history']
    ? JSON.parse(sessionAttributes['history'])
    : [];
  const firstTurnComplete = sessionAttributes['first_turn_complete'] === 'true';
  const isFirstTurn = history.length === 0 && !firstTurnComplete;

  // If input is empty and it's the first turn, provide initial greeting (NO BEDROCK - fast template)
  if ((!input || input.trim() === '') && isFirstTurn) {
    console.log('First turn with empty input - providing fast template greeting');
    
    try {
      // Quick company lookup (minimal data needed for greeting)
      const companyId = sessionAttributes['company_id'] || '';
      let companyName = '';
      
      if (companyId) {
        try {
          const companyData = await DynamoDBService.get('companies', { company_id: companyId });
          companyName = (companyData as Company)?.company_name || '';
        } catch (error) {
          console.warn('Could not get company by ID for greeting');
        }
      }
      
      // Get assistant name for greeting (quick lookup if available)
      let assistantName = 'your AI assistant';
      try {
        const agentConfig = await loadAgentConfig(companyId);
        assistantName = agentConfig?.ai_assistant_name || assistantName;
      } catch (error) {
        // Use default if config load fails
      }
      
      // Fast template greeting - no Bedrock call needed
      const greetingText = companyName
        ? `Hello! Thanks for calling ${companyName}. I'm ${assistantName}. How can I help you today?`
        : `Hello! I'm ${assistantName}. How can I help you today?`;

      // Update session attributes to mark first turn as complete
      const updatedSessionAttributes = {
        ...sessionAttributes,
        first_turn_complete: 'true',
      };

      return {
        sessionState: {
          sessionAttributes: updatedSessionAttributes,
          dialogAction: {
            type: 'ElicitIntent', // Ask Lex to listen for user input
          },
          intent: {
            name: 'FallbackIntent',
            state: 'InProgress',
          },
        },
        messages: [
          {
            contentType: 'SSML',
            content: wrapInSSML(greetingText),
          },
        ],
      };
    } catch (error) {
      console.error('Error generating initial greeting:', error);
      // Fallback to simple greeting
      return {
        sessionState: {
          sessionAttributes: {
            ...sessionAttributes,
            first_turn_complete: 'true',
          },
          dialogAction: {
            type: 'ElicitIntent',
          },
          intent: {
            name: 'FallbackIntent',
            state: 'InProgress',
          },
        },
        messages: [
          {
            contentType: 'SSML',
            content: wrapInSSML('Hello! I am the AI assistant. How can I help you today?'),
          },
        ],
      };
    }
  }

  // If input is empty and not first turn, delegate back to Lex to handle reprompt
  if (!input || input.trim() === '') {
    console.log('Empty input on subsequent turn, delegating to Lex');
    return delegate(event.sessionState);
  }

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

  // Check for call termination intent (user saying "yes", "that's all", "no thanks", etc.)
  // This happens when AI asks "will that be all?" or "anything else?" and user confirms they're done
  const terminationPatterns = [
    /^(yes|yeah|yep|yup|sure|ok|okay|that's all|that's it|nothing else|no thanks|no thank you|all set|we're good|we're done|I'm good|I'm done|nothing more|no more|done)$/i,
    /^(yes|yeah|yep|yup|sure|ok|okay),?\s*(that's all|that's it|nothing else|no thanks|all set|we're good|we're done|I'm good|I'm done)$/i,
    /^(no|nope),?\s*(thanks?|thank you|that's all|nothing else)$/i,
  ];

  const normalizedInput = input.trim().toLowerCase();
  const isTermination = terminationPatterns.some(pattern => pattern.test(normalizedInput));
  
  // Check if last assistant message contained termination question
  const lastAssistantMessage = historyForTerminationCheck.length > 0 
    ? historyForTerminationCheck.filter((h: any) => h.role === 'assistant').pop()?.content || ''
    : '';
  const askedTerminationQuestion = lastAssistantMessage.toLowerCase().match(/(will that be all|anything else|is there anything else|need anything else|all set|all good|anything more|something else|anything more I can help)/);

  if (isTermination && askedTerminationQuestion) {
    console.log('Call termination detected - user confirmed they are done');
    
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
      
      // Final closing message
      const closingMessage = companyName
        ? `Thank you for calling ${companyName}. Have a great day!`
        : 'Thank you for calling. Have a great day!';

      // Update session to mark call as complete
      const updatedSessionAttributes = {
        ...sessionAttributes,
        first_turn_complete: 'true',
        call_complete: 'true',
      };

      // Return Close with final message - Connect flow should handle call termination after this
      return {
        sessionState: {
          sessionAttributes: updatedSessionAttributes,
          dialogAction: {
            type: 'Close',
          },
          intent: {
            name: event.sessionState.intent.name,
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
      // Fallback termination message
      return close(
        event.sessionState,
        'Thank you for calling. Have a great day!'
      );
    }
  }

  try {
    // A. Get company information from session attributes (set by Connect)
    const companyId = sessionAttributes['company_id'] || '';
    const customerPhone = sessionAttributes['customerPhoneNumber'] || '';
    const systemPhone = sessionAttributes['systemPhoneNumber'] || '';
    const contactId = sessionAttributes['contactId'] || event.sessionId;

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

    // F. Retrieve Context (RAG) - Optimized to skip if no knowledge exists
    console.log(`Retrieving knowledge for company: ${company.company_id}`);
    const ragContext = await RAGService.retrieveRelevantKnowledge(
      company.company_id,
      input,
      5
    );
    console.log(`Retrieved ${ragContext.length} knowledge chunks`);

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

    // H. Generate Response via Bedrock
    let aiResult: { response: string; confidence: number; shouldFlag: boolean };

    // Generate AI response - pass FULL history so Bedrock knows context
    // Bedrock is instructed NOT to greet via system prompt
    console.log(isFirstTurn ? 'First turn - generating response with greeting prefix' : 'Subsequent turn - responding without greeting');
    aiResult = await BedrockService.generateResponse(
      agentConfig,
      company.company_name,
      input,
      ragContext,
      history // Pass history so Bedrock knows it's ongoing conversation (won't greet if history exists)
    );

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
    const greetingCheck = aiResult.response.toLowerCase().match(/^(hello|hi|hey|I'm|this is|thanks for calling|hello,|hi,|hey,)/);
    if (greetingCheck) {
      console.warn(`WARNING: Greeting pattern detected in response after stripGreetings: "${greetingCheck[0]}" - applying aggressive cleanup`);
      
      // Very aggressive stripping - remove everything up to and including first sentence if it contains greeting
      // Pattern: "Hello, I'm Sarah. [actual answer]" → extract "[actual answer]"
      const cleaned = aiResult.response.replace(/^(?:hello|hi|hey)[^.!]*I'm[^.!]*[.!]\s*/i, '').trim()
        .replace(/^I'm\s+[^.!]+[.!]\s*/i, '')
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
      "I'm sorry, I'm having trouble connecting to my brain right now. Please hold for an agent."
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
  
  // Remove common greeting patterns at the start (more aggressive)
  const greetingPatterns = [
    /^hello[,!]?\s*/i,
    /^hi[,!]?\s*/i,
    /^hey[,!]?\s*/i,
    /^thanks?\s+for\s+calling[^.]*[.!]?\s*/i,
    /^I'm\s+[^.!]+[.!]?\s*/i, // Matches "I'm Sarah." or "I'm your assistant."
    /^this\s+is\s+[^.!]+[.!]?\s*/i, // Matches "This is Sarah."
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
  const greetingWithAnswer = cleaned.match(/^(?:hello|hi|hey|I'm|this is)[^.!]*[.!]\s*(.+)$/i);
  if (greetingWithAnswer && greetingWithAnswer[1]) {
    cleaned = greetingWithAnswer[1].trim();
  }
  
  // Final check: if response still looks like it starts with greeting, try to find first real sentence
  if (cleaned.toLowerCase().match(/^(hello|hi|hey|I'm|this is)/)) {
    // Split by periods and take everything after first sentence if it contains greeting words
    const sentences = cleaned.split(/[.!]+\s*/);
    if (sentences.length > 1 && sentences[0].toLowerCase().match(/(hello|hi|hey|I'm|this is|thanks for calling)/)) {
      cleaned = sentences.slice(1).join('. ').trim();
    }
  }
  
  // If cleaning resulted in empty or too short response, return original
  // But still remove obvious greetings
  if (!cleaned || cleaned.length < 5) {
    // Last resort: just remove obvious greeting prefixes
    cleaned = original.replace(/^(?:hello|hi|hey|I'm|this is|thanks for calling)[^.!]*[.!]?\s*/i, '').trim() || original;
  }
  
  return cleaned || response; // Return original if cleaning resulted in empty string
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
function close(sessionState: any, message: string): LexV2Response {
  return {
    sessionState: {
      ...sessionState,
      dialogAction: {
        type: 'Close',
      },
      intent: {
        name: sessionState.intent.name,
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
