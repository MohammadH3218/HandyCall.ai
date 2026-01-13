import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

export interface DashboardStats {
  todayCalls: number;
  newLeads: number;
  appointments: number;
  pendingQuestions: number;
}

export interface RecentCall {
  call_id: string;
  caller_phone: string;
  caller_name?: string;
  created_at: string;
  duration?: number;
  status: string;
  summary?: string;
}

export interface UpcomingAppointment {
  appointment_id: string;
  contact_name: string;
  contact_phone: string;
  scheduled_time: string;
  service_type?: string;
  status: string;
}

@Injectable()
export class DashboardService {
  constructor(private dynamodb: DynamoDBService) {}

  async getStats(companyId: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // Get today's calls - use started_at field and date-index GSI if available, otherwise scan
    const callsResult = await this.queryWithFallback({
      table: 'calls',
      companyId,
      additionalConditions: {
        keyCondition: '#started_at >= :today',
        expressionAttributeNames: { '#started_at': 'started_at' },
        expressionAttributeValues: { ':today': todayTimestamp },
      },
      options: {
        indexName: 'date-index',
      },
      fallback: {
        filterExpression: '#company_id = :company_id AND (#started_at >= :today OR #created_at >= :today)',
        expressionAttributeNames: { '#company_id': 'company_id', '#started_at': 'started_at', '#created_at': 'created_at' },
        expressionAttributeValues: { ':company_id': companyId, ':today': todayTimestamp },
        sortBy: 'started_at',
        sortDirection: 'desc',
      },
    });

    // Count new leads (contacts created today) - no GSI, use scan
    const leadsResult = await this.queryWithFallback({
      table: 'contacts',
      companyId,
      additionalConditions: {},
      options: {},
      fallback: {
        filterExpression: '#company_id = :company_id AND #created_at >= :today',
        expressionAttributeNames: { '#company_id': 'company_id', '#created_at': 'created_at' },
        expressionAttributeValues: { ':company_id': companyId, ':today': todayTimestamp },
        sortBy: 'created_at',
        sortDirection: 'desc',
      },
    });

    // Get upcoming appointments - use scheduled_start field and date-index GSI if available
    const appointmentsResult = await this.queryWithFallback({
      table: 'appointments',
      companyId,
      additionalConditions: {
        keyCondition: '#scheduled_start >= :now',
        filterExpression: '#status IN (:scheduled, :confirmed)',
        expressionAttributeNames: { '#scheduled_start': 'scheduled_start', '#status': 'status' },
        expressionAttributeValues: { ':now': todayTimestamp, ':scheduled': 'SCHEDULED', ':confirmed': 'CONFIRMED' },
      },
      options: {
        indexName: 'date-index',
      },
      fallback: {
        filterExpression:
          '#company_id = :company_id AND (#scheduled_start >= :now OR #scheduled_time >= :now) AND (#status = :scheduled OR #status = :confirmed)',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#scheduled_start': 'scheduled_start',
          '#scheduled_time': 'scheduled_time',
          '#status': 'status',
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':now': todayTimestamp,
          ':scheduled': 'SCHEDULED',
          ':confirmed': 'CONFIRMED',
        },
        sortBy: 'scheduled_start',
        sortDirection: 'asc',
      },
    });

    // Get pending flagged questions - use status-index GSI if available, otherwise scan
    const questionsResult = await this.queryWithFallback({
      table: 'flagged_questions',
      companyId,
      additionalConditions: {},
      options: {},
      fallback: {
        filterExpression: '#company_id = :company_id AND #status = :pending',
        expressionAttributeNames: { '#company_id': 'company_id', '#status': 'status' },
        expressionAttributeValues: { ':company_id': companyId, ':pending': 'pending' },
        sortBy: 'created_at',
        sortDirection: 'desc',
      },
    });

    return {
      todayCalls: callsResult.count,
      newLeads: leadsResult.count,
      appointments: appointmentsResult.count,
      pendingQuestions: questionsResult.count,
    };
  }

  async getRecentCalls(companyId: string, limit = 5): Promise<RecentCall[]> {
    try {
      const result = await this.dynamodb.queryByCompany(
        'calls',
        companyId,
        {
          keyCondition: '#started_at >= :zero',
          expressionAttributeNames: { '#started_at': 'started_at' },
          expressionAttributeValues: { ':zero': 0 },
        },
        {
          indexName: 'date-index',
          limit,
          scanIndexForward: false, // Most recent first
        }
      );
      return result.items as RecentCall[];
    } catch (error) {
      // Fallback to scan if GSI doesn't exist
      console.warn('[DashboardService] Falling back to scan for recent calls:', error);
      const scanResult = await this.dynamodb.scan('calls', {
        filterExpression: '#company_id = :company_id',
        expressionAttributeNames: { '#company_id': 'company_id' },
        expressionAttributeValues: { ':company_id': companyId },
        limit,
      });
      let items = (scanResult.items || []) as RecentCall[];
      // Sort by started_at or created_at descending
      items = items.sort((a: any, b: any) => {
        const aVal = (a.started_at || a.created_at || 0) as number;
        const bVal = (b.started_at || b.created_at || 0) as number;
        return bVal - aVal;
      });
      return items.slice(0, limit);
    }
  }

  async getUpcomingAppointments(companyId: string, limit = 5): Promise<UpcomingAppointment[]> {
    const now = Date.now();

    const result = await this.queryWithFallback({
      table: 'appointments',
      companyId,
      additionalConditions: {
        keyCondition: '#scheduled_start >= :now',
        filterExpression: '#status IN (:scheduled, :confirmed)',
        expressionAttributeNames: { '#scheduled_start': 'scheduled_start', '#status': 'status' },
        expressionAttributeValues: { ':now': now, ':scheduled': 'SCHEDULED', ':confirmed': 'CONFIRMED' },
      },
      options: {
        indexName: 'date-index',
        limit,
        scanIndexForward: true, // Earliest first
      },
      fallback: {
        filterExpression:
          '#company_id = :company_id AND (#scheduled_start >= :now OR #scheduled_time >= :now) AND (#status = :scheduled OR #status = :confirmed)',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#scheduled_start': 'scheduled_start',
          '#scheduled_time': 'scheduled_time',
          '#status': 'status',
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':now': now,
          ':scheduled': 'SCHEDULED',
          ':confirmed': 'CONFIRMED',
        },
        sortBy: 'scheduled_start',
        sortDirection: 'asc',
      },
    });

    return result.items as UpcomingAppointment[];
  }

  private async queryWithFallback(params: {
    table: string;
    companyId: string;
    additionalConditions?: {
      keyCondition?: string;
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
    };
    options?: {
      indexName?: string;
      limit?: number;
      scanIndexForward?: boolean;
      exclusiveStartKey?: Record<string, any>;
    };
    fallback: {
      filterExpression: string;
      expressionAttributeNames: Record<string, string>;
      expressionAttributeValues: Record<string, any>;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    };
  }) {
    try {
      return await this.dynamodb.queryByCompany(
        params.table,
        params.companyId,
        params.additionalConditions,
        params.options
      );
    } catch (error: any) {
      // Gracefully fall back to a scan if the index or key condition is invalid in the current environment
      // Only log if it's not a ValidationException (which is expected when GSIs don't exist)
      if (error?.__type !== 'com.amazon.coral.validate#ValidationException') {
        console.warn(`[DashboardService] Falling back to scan for ${params.table}:`, error);
      }
      const scanResult = await this.dynamodb.scan(params.table, {
        filterExpression: params.fallback.filterExpression,
        expressionAttributeNames: params.fallback.expressionAttributeNames,
        expressionAttributeValues: params.fallback.expressionAttributeValues,
        limit: params.options?.limit,
      });

      let items = scanResult.items || [];
      const sortBy = params.fallback.sortBy;
      if (sortBy) {
        const direction = params.fallback.sortDirection === 'asc' ? 1 : -1;
        items = items.sort((a: any, b: any) => {
          const aVal = typeof a?.[sortBy] === 'number' ? a[sortBy] : Number(a?.[sortBy]) || 0;
          const bVal = typeof b?.[sortBy] === 'number' ? b[sortBy] : Number(b?.[sortBy]) || 0;
          return (aVal - bVal) * direction;
        });
      }

      if (params.options?.limit) {
        items = items.slice(0, params.options.limit);
      }

      return {
        items,
        count: items.length,
        lastEvaluatedKey: undefined,
      };
    }
  }
}
