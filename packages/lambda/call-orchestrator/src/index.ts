import { ConnectContactFlowEvent, ConnectResponse, Company, AgentConfig, Contact, Call } from './types/connect.types';
import { DynamoDBService } from './services/dynamodb.service';
import { RAGService } from './services/rag.service';
import { BedrockService } from './services/bedrock.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main Lambda handler for Amazon Connect call orchestration
 */
export const handler = async (event: ConnectContactFlowEvent): Promise<ConnectResponse> => {
  console.log('Received Connect event:', JSON.stringify(event, null, 2));

  try {
    const {Details: contactData} = event;
    const customerPhone = contactData.ContactData.CustomerEndpoint.Address;
    const systemPhone = contactData.ContactData.SystemEndpoint.Address;
    const contactId = contactData.ContactData.ContactId;

    // Extract user input from parameters (sent by Connect)
    const userMessage = contactData.Parameters.UserInput || '';

    console.log(`Processing call from ${customerPhone} to ${systemPhone}`);
    console.log(`User message: ${userMessage}`);

    // Step 1: Lookup company by phone number
    const company = await lookupCompanyByPhone(systemPhone);
    if (!company) {
      return createResponse('I\'m sorry, but I cannot process this call at the moment. Please try again later.');
    }

    console.log(`Found company: ${company.company_name} (${company.company_id})`);

    // Step 2: Load agent configuration
    const agentConfig = await loadAgentConfig(company.company_id);
    if (!agentConfig) {
      return createResponse('I\'m sorry, but the service is not configured properly. Please contact support.');
    }

    console.log(`Loaded agent config for company ${company.company_id}`);

    // Step 3: Find or create contact
    const contact = await findOrCreateContact(company.company_id, customerPhone);
    console.log(`Contact: ${contact.contact_id}`);

    // Step 4: Create or update call record
    const call = await createOrUpdateCall(company.company_id, contact.contact_id, contactId, customerPhone, systemPhone);
    console.log(`Call record: ${call.call_id}`);

    // Step 5: If this is the first message, use greeting
    if (!userMessage || userMessage.trim() === '') {
      const greeting = agentConfig.custom_greeting ||
        `Hello! Thank you for calling ${company.company_name}. I'm the AI assistant. How can I help you today?`;
      return createResponse(greeting);
    }

    // Step 6: Retrieve relevant knowledge using RAG
    const ragContext = await RAGService.retrieveRelevantKnowledge(
      company.company_id,
      userMessage,
      5
    );

    console.log(`Retrieved ${ragContext.length} knowledge chunks`);

    // Step 7: Generate AI response using Bedrock
    const { response, confidence, shouldFlag } = await BedrockService.generateResponse(
      agentConfig,
      company.company_name,
      userMessage,
      ragContext
    );

    console.log(`Generated response with ${confidence.toFixed(2)}% confidence`);

    // Step 8: If low confidence, create flagged question
    if (shouldFlag) {
      await createFlaggedQuestion(
        company.company_id,
        call.call_id,
        contact.contact_id,
        userMessage,
        response,
        confidence
      );
      console.log('Created flagged question due to low confidence');
    }

    // Step 9: Return response to Connect
    return createResponse(response);

  } catch (error) {
    console.error('Error processing call:', error);
    return createResponse('I apologize, but I\'m experiencing technical difficulties. Let me transfer you to someone who can help.');
  }
};

/**
 * Lookup company by phone number
 */
async function lookupCompanyByPhone(phoneNumber: string): Promise<Company | null> {
  try {
    const companies = await DynamoDBService.query(
      'companies',
      'phone_number = :phone',
      { ':phone': phoneNumber },
      'phone-index'
    );

    return companies.length > 0 ? companies[0] as Company : null;
  } catch (error) {
    console.error('Error looking up company:', error);
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

/**
 * Create Connect response (STRING_MAP format for Amazon Connect)
 */
function createResponse(message: string): ConnectResponse {
  return {
    response: message,
    timestamp: new Date().toISOString(),
  };
}
