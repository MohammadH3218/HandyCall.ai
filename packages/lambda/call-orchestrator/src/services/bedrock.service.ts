import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentConfig } from '../types/connect.types';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export interface BedrockResponse {
  response: string;
  confidence: number;
  shouldFlag: boolean;
}

export class BedrockService {
  /**
   * Generate AI response using Claude with RAG context
   */
  static async generateResponse(
    agentConfig: AgentConfig,
    companyName: string,
    userMessage: string,
    ragContext: Array<{ text: string; similarity: number }>,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<BedrockResponse> {
    try {
      // Build system prompt with agent configuration and RAG context
      // Pass conversationHistory to determine if we should instruct Bedrock NOT to greet
      const systemPrompt = this.buildSystemPrompt(agentConfig, companyName, ragContext, conversationHistory);

      // Build messages array
      // Pass conversation history so Bedrock knows context (won't greet if history exists)
      const messages = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage, // Keep user message clean - instructions are in system prompt
        },
      ];

      // Invoke Claude with optimized settings for faster response
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 200, // Reduced from 300 for faster response
          system: systemPrompt,
          messages: messages,
          temperature: 0.7,
        }),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await bedrockClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));

      const aiResponse = result.content[0].text;

      // Determine confidence based on RAG context similarity
      const avgSimilarity = ragContext.length > 0
        ? ragContext.reduce((sum, chunk) => sum + chunk.similarity, 0) / ragContext.length
        : 0;

      const confidence = avgSimilarity * 100;
      const shouldFlag = confidence < agentConfig.escalation_threshold;

      return {
        response: aiResponse,
        confidence,
        shouldFlag,
      };
    } catch (error) {
      console.error('Error generating Bedrock response:', error);
      throw error;
    }
  }

  /**
   * Build system prompt with agent config and RAG context
   */
  private static buildSystemPrompt(
    agentConfig: AgentConfig,
    companyName: string,
    ragContext: Array<{ text: string; similarity: number }>,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): string {
    const knowledgeBase = ragContext.map((c) => c.text).join('\n\n');
    const assistantName = agentConfig.ai_assistant_name || 'the AI assistant';
    
    // CRITICAL: NEVER greet or introduce - greetings are handled separately
    // Just respond directly to the caller's question

    // Optimized shorter system prompt for faster Bedrock responses
    // CRITICAL: Explicitly instruct Bedrock to NEVER greet or introduce - we handle greetings separately
    return `You are ${assistantName}, an AI phone assistant for ${companyName}. Speak naturally with contractions. Keep responses brief (1-2 sentences). Be warm and conversational.

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
- NEVER say "hello", "hi", "hey", or any greeting
- NEVER introduce yourself or say your name (${assistantName})
- NEVER say "I'm [name]" or "this is [name]"
- NEVER start with "Thanks for calling" - that's handled separately
- ALWAYS respond DIRECTLY to the question - just answer it immediately
- If conversation history exists (previous messages), you're mid-conversation - NO greetings
- The caller already knows who you are - just answer their question

Example WRONG responses:
- "Hello, I'm Sarah. We offer plumbing services..."
- "Hi! Thanks for calling. We offer..."
- "Hello! I'm Sarah and..."

Example CORRECT responses:
- "We offer plumbing, electrical, and HVAC services."
- "Our hours are Monday-Friday 8am-5pm."

KNOWLEDGE:
${knowledgeBase || 'No specific knowledge - provide general assistance.'}

CAPABILITIES:
- Pricing: ${agentConfig.can_discuss_pricing ? 'YES' : 'NO - offer callback'}
- Emergencies: ${agentConfig.can_handle_emergencies ? 'YES' : 'NO - escalate'}
- Booking: ${agentConfig.booking_mode}

RULES:
- NEVER guess about warranties, safety, or unknown details
- If unsure, offer callback: "Let me have the owner call you back about that"
- Keep SHORT and CONVERSATIONAL (phone call, not essay)
- If caller wants a person, offer transfer immediately
- DO NOT say your name or introduce yourself - just answer the question
- After answering a question, if it seems like the caller might be done, ask: "Will that be all?" or "Is there anything else I can help you with?" (but only once per conversation, not after every answer)`;
  }
}
