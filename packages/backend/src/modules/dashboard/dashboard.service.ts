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
    const callsResult = await this.dynamodb.queryByCompany(
      'calls',
      companyId,
      {
        keyCondition: '#created_at >= :today',
        filterExpression: undefined,
      },
      {
        indexName: 'company_id-created_at-index',
      }
    );

    // Count new leads (contacts created today)
    const leadsResult = await this.dynamodb.queryByCompany(
      'contacts',
      companyId,
      {
        keyCondition: '#created_at >= :today',
      },
      {
        indexName: 'company_id-created_at-index',
      }
    );

    // Get upcoming appointments
    const appointmentsResult = await this.dynamodb.queryByCompany(
      'appointments',
      companyId,
      {
        keyCondition: '#scheduled_time >= :now',
        filterExpression: '#status = :active',
      },
      {
        indexName: 'company_id-scheduled_time-index',
      }
    );

    // Get pending flagged questions
    const questionsResult = await this.dynamodb.queryByCompany(
      'flagged_questions',
      companyId,
      {
        filterExpression: '#status = :pending',
      }
    );

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
    const now = new Date().toISOString();

    const result = await this.dynamodb.queryByCompany(
      'appointments',
      companyId,
      {
        keyCondition: '#scheduled_time >= :now',
        filterExpression: '#status IN (:confirmed, :pending)',
      },
      {
        indexName: 'company_id-scheduled_time-index',
        limit,
        scanIndexForward: true, // Earliest first
      }
    );

    return result.items as UpcomingAppointment[];
  }
}
