import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class AppointmentsService {
  constructor(private dynamodb: DynamoDBService) {}

  async listAppointments(
    companyId: string,
    options?: { limit?: number; lastEvaluatedKey?: any }
  ): Promise<{ appointments: any[]; lastEvaluatedKey?: any }> {
    try {
      const result = await this.dynamodb.queryByCompany(
        'appointments',
        companyId,
        {},
        {
          indexName: 'date-index',
          limit: options?.limit || 50,
          scanIndexForward: true, // upcoming first
          exclusiveStartKey: options?.lastEvaluatedKey,
        }
      );

      return { appointments: result.items || [], lastEvaluatedKey: result.lastEvaluatedKey };
    } catch (error) {
      // Fallback to scan if GSI doesn't exist in this environment
      const scan = await this.dynamodb.scan('appointments', {
        filterExpression: '#company_id = :company_id',
        expressionAttributeNames: { '#company_id': 'company_id' },
        expressionAttributeValues: { ':company_id': companyId },
        limit: options?.limit || 50,
        exclusiveStartKey: options?.lastEvaluatedKey,
      });
      return { appointments: scan.items || [], lastEvaluatedKey: scan.lastEvaluatedKey };
    }
  }

  async getAppointment(companyId: string, appointmentId: string): Promise<any> {
    const appt = await this.dynamodb.get('appointments', {
      company_id: companyId,
      appointment_id: appointmentId,
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    return appt;
  }
}
