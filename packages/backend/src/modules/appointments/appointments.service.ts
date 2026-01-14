import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '@handycall/shared';

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

  async listAppointmentsInRange(companyId: string, startMs: number, endMs: number): Promise<any[]> {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new BadRequestException('Invalid start/end');
    }

    try {
      const result = await this.dynamodb.queryByCompany(
        'appointments',
        companyId,
        {
          keyCondition: '#scheduled_start BETWEEN :start AND :end',
          expressionAttributeNames: { '#scheduled_start': 'scheduled_start' },
          expressionAttributeValues: { ':start': startMs, ':end': endMs },
        },
        {
          indexName: 'date-index',
          scanIndexForward: true,
          limit: 500,
        }
      );
      return result.items || [];
    } catch {
      const scan = await this.dynamodb.scan('appointments', {
        filterExpression: '#company_id = :company_id AND #scheduled_start BETWEEN :start AND :end',
        expressionAttributeNames: { '#company_id': 'company_id', '#scheduled_start': 'scheduled_start' },
        expressionAttributeValues: { ':company_id': companyId, ':start': startMs, ':end': endMs },
        limit: 500,
      });
      return scan.items || [];
    }
  }

  async createAppointment(
    companyId: string,
    input: {
      scheduled_start: number;
      scheduled_end: number;
      contact_name?: string;
      contact_email?: string;
      service_type?: string;
      notes?: string;
      created_by?: string;
    }
  ) {
    if (!Number.isFinite(input.scheduled_start) || !Number.isFinite(input.scheduled_end)) {
      throw new BadRequestException('scheduled_start and scheduled_end are required');
    }
    if (input.scheduled_end <= input.scheduled_start) {
      throw new BadRequestException('scheduled_end must be after scheduled_start');
    }

    const now = Date.now();
    const appointment_id = uuidv4();
    const appointment = {
      company_id: companyId,
      appointment_id,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      status: AppointmentStatus.SCHEDULED,
      service_type: input.service_type ?? 'Service',
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      notes: input.notes,
      created_by: input.created_by ?? 'USER',
      confirmed: true,
      created_at: now,
      updated_at: now,
    };

    await this.dynamodb.put('appointments', appointment);
    return appointment;
  }

  async cancelAppointment(companyId: string, appointmentId: string) {
    const appt = await this.getAppointment(companyId, appointmentId);
    const now = Date.now();
    const updated = await this.dynamodb.update(
      'appointments',
      { company_id: companyId, appointment_id: appointmentId },
      { status: AppointmentStatus.CANCELLED, updated_at: now }
    );
    return updated ?? { ...appt, status: AppointmentStatus.CANCELLED, updated_at: now };
  }
}
