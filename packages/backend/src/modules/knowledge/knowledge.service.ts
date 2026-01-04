import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { RagService } from '../rag/rag.service';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeItem {
  company_id: string;
  knowledge_id: string;
  title: string;
  content: string;
  type: 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY';
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  source?: string;
  tags?: string[];
  created_at: number;
  updated_at: number;
}

export interface CreateKnowledgeDto {
  title: string;
  content: string;
  type: 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY';
  source?: string;
  tags?: string[];
}

export interface UpdateKnowledgeDto {
  title?: string;
  content?: string;
  type?: 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY';
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  tags?: string[];
}

@Injectable()
export class KnowledgeService {
  private tableName: string;

  constructor(
    private dynamodb: DynamoDBService,
    private ragService: RagService,
    private configService: ConfigService,
  ) {
    // Use the base table name and let the shared DynamoDB service prepend the configured prefix
    this.tableName = 'knowledge_items';
  }

  /**
   * Create a new knowledge item with automatic chunking and embedding
   */
  async createKnowledgeItem(
    companyId: string,
    data: CreateKnowledgeDto,
  ): Promise<KnowledgeItem> {
    try {
      const knowledgeId = uuidv4();
      const now = Date.now();

      const knowledgeItem: KnowledgeItem = {
        company_id: companyId,
        knowledge_id: knowledgeId,
        title: data.title,
        content: data.content,
        type: data.type,
        status: 'ACTIVE',
        source: data.source,
        tags: data.tags || [],
        created_at: now,
        updated_at: now,
      };

      // Store knowledge item in DynamoDB
      await this.dynamodb.put(this.tableName, {
        ...knowledgeItem,
        type_created: `${data.type}#${now}`, // GSI sort key
        status_updated: `${knowledgeItem.status}#${now}`, // GSI sort key
      });

      // Chunk and embed the content using RAG service
      const fullText = `${data.title}\n\n${data.content}`;
      await this.ragService.chunkAndStoreKnowledge(companyId, knowledgeId, fullText);

      return knowledgeItem;
    } catch (error: any) {
      console.error('Error creating knowledge item:', error);
      throw new Error(`Failed to create knowledge item: ${error.message}`);
    }
  }

  /**
   * Update an existing knowledge item and re-chunk if content changed
   */
  async updateKnowledgeItem(
    companyId: string,
    knowledgeId: string,
    data: UpdateKnowledgeDto,
  ): Promise<KnowledgeItem> {
    try {
      // Get existing item
      const existing = await this.getKnowledgeItem(companyId, knowledgeId);
      if (!existing) {
        throw new NotFoundException(`Knowledge item ${knowledgeId} not found`);
      }

      const now = Date.now();
      const contentChanged = data.content && data.content !== existing.content;

      // Update fields
      const updated: KnowledgeItem = {
        ...existing,
        ...data,
        updated_at: now,
      };

      // Update in DynamoDB
      await this.dynamodb.update(
        this.tableName,
        { company_id: companyId, knowledge_id: knowledgeId },
        {
          ...data,
          updated_at: now,
          ...(data.status && { status_updated: `${data.status}#${now}` }),
          ...(data.type && { type_created: `${data.type}#${existing.created_at}` }),
        },
      );

      // If content changed, re-chunk and re-embed
      if (contentChanged) {
        // Delete old chunks
        await this.ragService.deleteKnowledgeChunks(companyId, knowledgeId);

        // Create new chunks
        const fullText = `${updated.title}\n\n${updated.content}`;
        await this.ragService.chunkAndStoreKnowledge(companyId, knowledgeId, fullText);
      }

      return updated;
    } catch (error: any) {
      console.error('Error updating knowledge item:', error);
      throw new Error(`Failed to update knowledge item: ${error.message}`);
    }
  }

  /**
   * Delete a knowledge item and all its chunks
   */
  async deleteKnowledgeItem(companyId: string, knowledgeId: string): Promise<void> {
    try {
      // Delete chunks first
      await this.ragService.deleteKnowledgeChunks(companyId, knowledgeId);

      // Delete knowledge item
      await this.dynamodb.delete(this.tableName, {
        company_id: companyId,
        knowledge_id: knowledgeId,
      });
    } catch (error: any) {
      console.error('Error deleting knowledge item:', error);
      throw new Error(`Failed to delete knowledge item: ${error.message}`);
    }
  }

  /**
   * Get a single knowledge item
   */
  async getKnowledgeItem(
    companyId: string,
    knowledgeId: string,
  ): Promise<KnowledgeItem | null> {
    try {
      const item = await this.dynamodb.get(this.tableName, {
        company_id: companyId,
        knowledge_id: knowledgeId,
      });

      return (item as KnowledgeItem) || null;
    } catch (error: any) {
      console.error('Error getting knowledge item:', error);
      throw new Error(`Failed to get knowledge item: ${error.message}`);
    }
  }

  /**
   * List all knowledge items for a company
   */
  async listKnowledgeItems(
    companyId: string,
    filters?: {
      type?: string;
      status?: string;
      limit?: number;
    },
  ): Promise<KnowledgeItem[]> {
    try {
      const filterPieces: string[] = [];
      const expressionAttributeNames: Record<string, string> = {
        '#company_id': 'company_id',
      };
      const expressionAttributeValues: Record<string, any> = {
        ':company_id': companyId,
      };

      if (filters?.type) {
        filterPieces.push('#type = :type');
        expressionAttributeNames['#type'] = 'type';
        expressionAttributeValues[':type'] = filters.type;
      }
      if (filters?.status) {
        filterPieces.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      const filterExpression = filterPieces.length > 0 ? filterPieces.join(' AND ') : undefined;

      let result;
      try {
        // Prefer a company-scoped query; it will use the base PK and apply filterExpression if provided.
        result = await this.dynamodb.queryByCompany(
          this.tableName,
          companyId,
          {
            filterExpression,
            expressionAttributeNames,
            expressionAttributeValues,
          },
          {
            limit: filters?.limit,
          },
        );
      } catch (queryError) {
        console.warn('[KnowledgeService] Falling back to scan for knowledge items:', queryError);
        // Fallback to scan if the index/key condition is not available in the deployed table
        result = await this.dynamodb.scan(this.tableName, {
          filterExpression: ['#company_id = :company_id', filterExpression].filter(Boolean).join(' AND '),
          expressionAttributeNames,
          expressionAttributeValues,
          limit: filters?.limit,
        });
      }

      // Sort newest first by updated_at to keep UI stable
      const items = ((result.items || []) as KnowledgeItem[]).sort(
        (a, b) => (b?.updated_at || 0) - (a?.updated_at || 0),
      );

      return filters?.limit ? items.slice(0, filters.limit) : items;
    } catch (error: any) {
      console.error('Error listing knowledge items:', error);
      throw new Error(`Failed to list knowledge items: ${error.message}`);
    }
  }

  /**
   * Bulk import knowledge items from JSON array
   */
  async bulkImport(
    companyId: string,
    items: CreateKnowledgeDto[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        await this.createKnowledgeItem(companyId, item);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${item.title}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Search knowledge using semantic search (queries RAG service)
   */
  async searchKnowledge(
    companyId: string,
    query: string,
    topK: number = 5,
  ): Promise<Array<{ item: KnowledgeItem; text: string; similarity: number }>> {
    try {
      // Get relevant chunks using RAG
      const chunks = await this.ragService.retrieveRelevantKnowledge(
        companyId,
        query,
        topK,
      );

      // Get full knowledge items for the chunks
      const knowledgeIds = [...new Set(chunks.map((c) => c.knowledge_id))];
      const items: Array<{ item: KnowledgeItem; text: string; similarity: number }> = [];

      for (const knowledgeId of knowledgeIds) {
        const item = await this.getKnowledgeItem(companyId, knowledgeId);
        if (item) {
          const chunk = chunks.find((c) => c.knowledge_id === knowledgeId);
          items.push({
            item,
            text: chunk?.text || '',
            similarity: chunk?.similarity || 0,
          });
        }
      }

      return items.sort((a, b) => b.similarity - a.similarity);
    } catch (error: any) {
      console.error('Error searching knowledge:', error);
      throw new Error(`Failed to search knowledge: ${error.message}`);
    }
  }
}
