import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { UsageService } from '../billing/usage.service';
import { SubscriptionPlan } from '@handycall/shared';

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
    private usageService: UsageService,
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
        // Production table uses `date-index` (company_id + started_at) for recency ordering.
        indexName: 'date-index',
        limit: options?.limit || 50,
        scanIndexForward: false, // Most recent first
        exclusiveStartKey: options?.lastEvaluatedKey,
      }
    );

    return {
      calls: (result.items || []).map((item: any) => this.toUiCall(item)),
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  async getCallById(companyId: string, callId: string): Promise<Call> {
    const raw = await this.dynamodb.get('calls', {
      company_id: companyId,
      call_id: callId,
    });

    if (!raw) {
      throw new NotFoundException('Call not found');
    }

    const call: any = this.toUiCall(raw);

    // Generate presigned URL for recording if it exists
    const recordingExists = await this.s3Service.recordingExists(companyId, callId);
    if (recordingExists) {
      call.recording_url = await this.s3Service.getRecordingUrl(companyId, callId);
    }

    // Get transcript if available
    try {
      const transcript = await this.s3Service.getTranscript(companyId, callId);
      if (transcript) {
        call.transcript =
          typeof transcript === 'string'
            ? transcript
            : typeof transcript?.text === 'string'
              ? transcript.text
              : JSON.stringify(transcript, null, 2);
      }
    } catch (error) {
      // Transcript doesn't exist, that's okay
    }

    return call as Call;
  }

  async getRecordingUrl(companyId: string, callId: string): Promise<string> {
    // Verify call belongs to company
    const call = await this.dynamodb.get('calls', {
      company_id: companyId,
      call_id: callId,
    });

    if (!call) {
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
        indexName: 'date-index',
        limit: options?.limit || 50,
        scanIndexForward: false,
      }
    );

    // Filter results based on query
    const filtered = result.items.filter((call: any) => {
      const searchableText = [
        call.from_number,
        call.to_number,
        call.caller_phone,
        call.caller_name,
        call.summary,
      ].join(' ').toLowerCase();
      return searchableText.includes(query.toLowerCase());
    });

    return filtered.map((item: any) => this.toUiCall(item));
  }

  private toUiCall(item: any): Call {
    const startedAt =
      typeof item?.started_at === 'number'
        ? item.started_at
        : typeof item?.created_at === 'number'
          ? item.created_at
          : undefined;

    const createdAtIso = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString();

    return {
      call_id: item.call_id,
      company_id: item.company_id,
      caller_phone: item.from_number || item.caller_phone || 'Unknown',
      caller_name: item.caller_name,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : createdAtIso,
      duration: item.duration_seconds ?? item.duration,
      status: item.status,
      summary: item.summary,
      sentiment: item.sentiment,
      tags: item.tags,
      transcript: item.transcript,
      recording_url: item.recording_url,
    };
  }

  /**
   * Record usage for a completed call. Intended to be invoked by the telephony
   * pipeline once a call duration is known (to avoid double-counting on reads).
   */
  async recordCallUsage(companyId: string, durationSeconds?: number, plan?: SubscriptionPlan) {
    if (!durationSeconds || durationSeconds <= 0) {
      return;
    }
    const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
    await this.usageService.incrementCallMinutes(companyId, minutes);

    // Optional: callers can provide plan to check limits; if omitted we only persist usage
    if (plan) {
      const periodStart = Date.now(); // placeholder; caller should pass actual billing period if available
      await this.usageService.checkLimitsExceeded(companyId, plan, periodStart);
    }
  }
}
