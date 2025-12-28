import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TranscriptSegment, CallHighlight } from '../types/s3.types';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const HAIKU_MODEL_ID = process.env.BEDROCK_HAIKU_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

export class BedrockService {
  /**
   * Generate a summary of the call using Claude Haiku (cost-effective)
   */
  static async generateSummary(
    transcript: string,
    companyName: string,
  ): Promise<{
    summary: string;
    outcome: string;
    nextSteps: string[];
  }> {
    const prompt = `You are analyzing a phone call transcript for ${companyName}.

Transcript:
${transcript}

Please provide:
1. A concise summary (2-3 sentences) of what the customer wanted and how the AI assistant handled it
2. The outcome of the call (e.g., "Question answered", "Appointment requested", "Pricing inquiry", "Issue escalated")
3. Next steps or action items (if any)

Format your response as JSON:
{
  "summary": "...",
  "outcome": "...",
  "nextSteps": ["...", "..."]
}`;

    const command = new InvokeModelCommand({
      modelId: HAIKU_MODEL_ID,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistent analysis
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = result.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback if JSON parsing fails
      return {
        summary: transcript.substring(0, 200) + '...',
        outcome: 'Call completed',
        nextSteps: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Extract highlights from the call
   */
  static async extractHighlights(
    transcript: string,
    segments: TranscriptSegment[],
  ): Promise<Array<{ type: string; content: string; timestamp?: number }>> {
    const prompt = `Analyze this call transcript and identify any important highlights:

Transcript:
${transcript}

Identify and extract:
1. PRICING_DISCUSSED - Any discussion of prices, quotes, or costs
2. COMPLAINT - Customer complaints or dissatisfaction
3. APPOINTMENT_MENTIONED - Any mention of scheduling or appointments
4. EMERGENCY - Urgent or emergency situations
5. ESCALATION_REQUESTED - Customer asking for a human or manager

Format your response as JSON array:
[
  {"type": "PRICING_DISCUSSED", "content": "Customer asked about hourly rates for plumbing service"},
  {"type": "APPOINTMENT_MENTIONED", "content": "Customer wants to schedule for next Tuesday"}
]

If no highlights found, return empty array: []`;

    const command = new InvokeModelCommand({
      modelId: HAIKU_MODEL_ID,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = result.content[0].text;

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse highlights JSON:', error);
      return [];
    }
  }

  /**
   * Detect potential flagged questions in the transcript
   */
  static async detectFlaggedQuestions(
    transcript: string,
  ): Promise<Array<{ question: string; context: string }>> {
    const prompt = `Analyze this call transcript and identify any questions the AI assistant struggled to answer or seemed uncertain about:

Transcript:
${transcript}

Look for:
- Questions where the AI said "I'm not sure" or "I don't know"
- Questions the AI couldn't answer confidently
- Topics the AI deflected or avoided

Format your response as JSON array:
[
  {
    "question": "What are your rates for emergency weekend service?",
    "context": "Customer asked about weekend emergency pricing but AI didn't have specific information"
  }
]

If no flagged questions, return empty array: []`;

    const command = new InvokeModelCommand({
      modelId: HAIKU_MODEL_ID,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = result.content[0].text;

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse flagged questions JSON:', error);
      return [];
    }
  }
}
