import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompanyId } from '../../common/decorators/auth.decorator';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  listAppointments(
    @CompanyId() companyId: string,
    @Query('limit') limit?: string,
    @Query('lastEvaluatedKey') lastEvaluatedKey?: string,
  ) {
    return this.appointments.listAppointments(companyId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined,
    });
  }

  @Get(':appointmentId')
  getAppointment(
    @CompanyId() companyId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointments.getAppointment(companyId, appointmentId);
  }
}
