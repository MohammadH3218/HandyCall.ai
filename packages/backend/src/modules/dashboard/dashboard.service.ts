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

    // Get today's calls
    const callsResult = await this.queryWithFallback({
      table: 'calls',
      companyId,
      additionalConditions: {
        keyCondition: '#created_at >= :today',
        expressionAttributeNames: { '#created_at': 'created_at' },
        expressionAttributeValues: { ':today': todayTimestamp },
      },
      options: {
        indexName: 'company_id-created_at-index',
      },
      fallback: {
        filterExpression: '#company_id = :company_id AND #created_at >= :today',
        expressionAttributeNames: { '#company_id': 'company_id', '#created_at': 'created_at' },
        expressionAttributeValues: { ':company_id': companyId, ':today': todayTimestamp },
        sortBy: 'created_at',
        sortDirection: 'desc',
      },
    });

    // Count new leads (contacts created today)
    const leadsResult = await this.queryWithFallback({
      table: 'contacts',
      companyId,
      additionalConditions: {
        keyCondition: '#created_at >= :today',
        expressionAttributeNames: { '#created_at': 'created_at' },
        expressionAttributeValues: { ':today': todayTimestamp },
      },
      options: {
        indexName: 'company_id-created_at-index',
      },
      fallback: {
        filterExpression: '#company_id = :company_id AND #created_at >= :today',
        expressionAttributeNames: { '#company_id': 'company_id', '#created_at': 'created_at' },
        expressionAttributeValues: { ':company_id': companyId, ':today': todayTimestamp },
        sortBy: 'created_at',
        sortDirection: 'desc',
      },
    });

    // Get upcoming appointments
    const appointmentsResult = await this.queryWithFallback({
      table: 'appointments',
      companyId,
      additionalConditions: {
        keyCondition: '#scheduled_time >= :now',
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#scheduled_time': 'scheduled_time', '#status': 'status' },
        expressionAttributeValues: { ':now': todayTimestamp, ':active': 'active' },
      },
      options: {
        indexName: 'company_id-scheduled_time-index',
      },
      fallback: {
        filterExpression: '#company_id = :company_id AND #scheduled_time >= :now AND #status = :active',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#scheduled_time': 'scheduled_time',
          '#status': 'status',
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':now': todayTimestamp,
          ':active': 'active',
        },
        sortBy: 'scheduled_time',
        sortDirection: 'asc',
      },
    });

    // Get pending flagged questions
    const questionsResult = await this.queryWithFallback({
      table: 'flagged_questions',
      companyId,
      additionalConditions: {
        filterExpression: '#status = :pending',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':pending': 'pending' },
      },
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
    const result = await this.dynamodb.queryByCompany(
      'calls',
      companyId,
      {},
      {
        indexName: 'company_id-created_at-index',
        limit,
        scanIndexForward: false, // Most recent first
      }
    );

    return result.items as RecentCall[];
  }

  async getUpcomingAppointments(companyId: string, limit = 5): Promise<UpcomingAppointment[]> {
    const now = Date.now();

    const result = await this.queryWithFallback({
      table: 'appointments',
      companyId,
      additionalConditions: {
        keyCondition: '#scheduled_time >= :now',
        filterExpression: '#status IN (:confirmed, :pending)',
        expressionAttributeNames: { '#scheduled_time': 'scheduled_time', '#status': 'status' },
        expressionAttributeValues: { ':now': now, ':confirmed': 'confirmed', ':pending': 'pending' },
      },
      options: {
        indexName: 'company_id-scheduled_time-index',
        limit,
        scanIndexForward: true, // Earliest first
      },
      fallback: {
        filterExpression:
          '#company_id = :company_id AND #scheduled_time >= :now AND (#status = :confirmed OR #status = :pending)',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#scheduled_time': 'scheduled_time',
          '#status': 'status',
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':now': now,
          ':confirmed': 'confirmed',
          ':pending': 'pending',
        },
        sortBy: 'scheduled_time',
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
    } catch (error) {
      // Gracefully fall back to a scan if the index or key condition is invalid in the current environment
      console.warn(`[DashboardService] Falling back to scan for ${params.table}:`, error);
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
