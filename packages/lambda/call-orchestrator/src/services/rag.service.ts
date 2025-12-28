import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBService } from './dynamodb.service';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const EMBEDDING_MODEL_ID = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v1';

export class RAGService {
  /**
   * Generate embedding for a text query
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: EMBEDDING_MODEL_ID,
      body: JSON.stringify({ inputText: text }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.embedding;
  }

  /**
   * Retrieve relevant knowledge chunks for a query
   */
  static async retrieveRelevantKnowledge(
    companyId: string,
    query: string,
    topK: number = 5,
  ): Promise<Array<{ text: string; similarity: number }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all knowledge chunks for the company
      const chunks = await DynamoDBService.scan('knowledge_chunks', 'company_id = :company_id', {
        ':company_id': companyId,
      });

      if (chunks.length === 0) {
        return [];
      }

      // Calculate cosine similarity for each chunk
      const rankedChunks = chunks
        .map((chunk) => ({
          text: chunk.text,
          similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return rankedChunks;
    } catch (error) {
      console.error('Error retrieving knowledge:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
