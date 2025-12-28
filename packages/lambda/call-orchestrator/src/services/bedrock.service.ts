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
      const systemPrompt = this.buildSystemPrompt(agentConfig, companyName, ragContext);

      // Build messages array
      const messages = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      // Invoke Claude
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 300,
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
  ): string {
    const knowledgeBase = ragContext.map((c) => c.text).join('\n\n');

    return `You are an AI receptionist for ${companyName}, a ${agentConfig.greeting_tone} business assistant.

PERSONALITY & TONE:
- Greeting tone: ${agentConfig.greeting_tone}
${agentConfig.custom_greeting ? `- Custom greeting: ${agentConfig.custom_greeting}` : ''}
- Be professional, helpful, and concise
- Keep responses under 3 sentences (this is a phone conversation)

KNOWLEDGE BASE:
${knowledgeBase || 'No specific knowledge available - provide general assistance only.'}

CAPABILITIES:
- Can discuss pricing: ${agentConfig.can_discuss_pricing ? 'YES' : 'NO - defer to owner'}
- Can handle emergencies: ${agentConfig.can_handle_emergencies ? 'YES' : 'NO - escalate immediately'}
- Booking mode: ${agentConfig.booking_mode}
- Languages: ${agentConfig.languages.join(', ')}

CRITICAL RULES:
1. NEVER guess chemicals, warranties, or safety information
2. If you're not confident about an answer (< 70%), say "Let me have the owner call you back about that specific question"
3. Always confirm appointment details twice before booking
4. Keep responses SHORT and NATURAL for phone conversation
5. If the caller seems frustrated or requests a person, offer to transfer immediately

Remember: You are clearly an AI assistant. Be helpful but honest about your limitations.`;
  }
}
