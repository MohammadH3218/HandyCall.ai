import { BedrockRuntimeClient, ConverseCommand, Message } from '@aws-sdk/client-bedrock-runtime';
import { AgentConfig } from '../types/connect.types';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
// Default to Nova Micro (fast + no Marketplace subscription friction).
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

export interface BedrockResponse {
  response: string;
  confidence: number;
  shouldFlag: boolean;
}

export class BedrockService {
  /**
   * Generate AI response using Bedrock with optional RAG context
   */
  static async generateResponse(
    agentConfig: AgentConfig,
    companyName: string,
    userMessage: string,
    ragContext: Array<{ text: string; similarity: number }>,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<BedrockResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(agentConfig, companyName, ragContext);

      const messages: Message[] = [
        ...conversationHistory
          .filter((m) => m?.content)
          .map((m) => {
            const role: 'assistant' | 'user' = m.role === 'assistant' ? 'assistant' : 'user';
            return { role, content: [{ text: m.content }] };
          }),
        { role: 'user', content: [{ text: userMessage }] },
      ];

      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: systemPrompt }],
          messages,
          inferenceConfig: {
            maxTokens: 160,
            temperature: 0.7,
          },
        }),
      );

      const aiResponse = (response.output?.message?.content || [])
        .map((c) => c.text || '')
        .join('')
        .trim();

      // Confidence is only meaningful when RAG is configured; otherwise we'd flag every turn.
      const hasRag = ragContext.length > 0;
      const avgSimilarity = hasRag
        ? ragContext.reduce((sum, chunk) => sum + chunk.similarity, 0) / ragContext.length
        : 0;

      const confidence = hasRag ? avgSimilarity * 100 : 100;
      const shouldFlag = hasRag ? confidence < agentConfig.escalation_threshold : false;

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
    const assistantName = agentConfig.ai_assistant_name || 'the AI assistant';

    return `You are ${assistantName}, a friendly AI receptionist for ${companyName}.

Style:
- Reply in 1-2 short sentences (under ~25 words).
- No formal greeting; start with a brief acknowledgement ("Got it", "Okay", "Sure").
- Ask exactly ONE question when you need more info.
- Use natural contractions and simple words.
- Sometimes add a tiny filler clause to sound conversational (e.g., "One sec - let me note that down.") but don't overdo it.

Conversation flow (think like a receptionist):
1) Understand the service + the issue (ask a clarifying question or two if needed).
2) Answer questions using Knowledge when available (otherwise be honest you don't have that detail yet).
3) Only after the issue is clear, help gather booking details (name, zip/address, day/time) one at a time.
4) After confirming details, ask: "Anything else I can help with?"

Rules:
- NEVER invent phone numbers, and NEVER tell them to call a different number.
- NEVER mention transferring to an agent or asking them to hold for an agent.
- Don't claim you checked systems, pricing, availability, or service areas unless it's explicitly in Knowledge.
- If Knowledge is missing/insufficient, ask one clarifying question instead of guessing.

Knowledge:
${knowledgeBase || 'None'}`;
  }
}

