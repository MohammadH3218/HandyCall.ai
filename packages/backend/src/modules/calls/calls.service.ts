import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';

export interface Call {
  call_id: string;
  company_id: string;
  caller_phone: string;
  caller_name?: string;
  created_at: string;
  duration?: number;
  status: string;
  summary?: string;
  transcript?: string;
  recording_url?: string;
  sentiment?: string;
  tags?: string[];
}

@Injectable()
export class CallsService {
  constructor(
    private dynamodb: DynamoDBService,
    private s3Service: S3Service,
  ) {}

  async getCalls(
    companyId: string,
    options?: {
      limit?: number;
      lastEvaluatedKey?: any;
    }
  ): Promise<{ calls: Call[]; lastEvaluatedKey?: any }> {
    const result = await this.dynamodb.queryByCompany(
      'calls',
      companyId,
      {},
      {
        indexName: 'company_id-created_at-index',
        limit: options?.limit || 50,
        scanIndexForward: false, // Most recent first
        exclusiveStartKey: options?.lastEvaluatedKey,
      }
    );

    return {
      calls: result.items as Call[],
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  async getCallById(companyId: string, callId: string): Promise<Call> {
    const call = await this.dynamodb.get('calls', {
      call_id: callId,
    });

    if (!call || call.company_id !== companyId) {
      throw new NotFoundException('Call not found');
    }

    // Generate presigned URL for recording if it exists
    const recordingExists = await this.s3Service.recordingExists(companyId, callId);
    if (recordingExists) {
      call.recording_url = await this.s3Service.getRecordingUrl(companyId, callId);
    }

    // Get transcript if available
    try {
      const transcript = await this.s3Service.getTranscript(companyId, callId);
      if (transcript) {
        call.transcript = transcript;
      }
    } catch (error) {
      // Transcript doesn't exist, that's okay
    }

    return call as Call;
  }

  async getRecordingUrl(companyId: string, callId: string): Promise<string> {
    // Verify call belongs to company
    const call = await this.dynamodb.get('calls', {
      call_id: callId,
    });

    if (!call || call.company_id !== companyId) {
      throw new NotFoundException('Call not found');
    }

    const recordingExists = await this.s3Service.recordingExists(companyId, callId);
    if (!recordingExists) {
      throw new NotFoundException('Recording not found');
    }

    return this.s3Service.getRecordingUrl(companyId, callId);
  }

  async searchCalls(
    companyId: string,
    query: string,
    options?: {
      limit?: number;
    }
  ): Promise<Call[]> {
    // For now, do a simple scan with filter
    // In production, you'd want to use ElasticSearch or similar
    const result = await this.dynamodb.queryByCompany(
      'calls',
      companyId,
      {},
      {
        indexName: 'company_id-created_at-index',
        limit: options?.limit || 50,
        scanIndexForward: false,
      }
    );

    // Filter results based on query
    const filtered = result.items.filter((call: any) => {
      const searchableText = [
        call.caller_phone,
        call.caller_name,
        call.summary,
      ].join(' ').toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });

    return filtered as Call[];
  }
}
