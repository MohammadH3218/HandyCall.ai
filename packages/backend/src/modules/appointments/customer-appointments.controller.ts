import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { AuthContext } from '@handycall/shared';
import { AppointmentsService } from './appointments.service';
import { CustomerProfilesService } from '../customer-profiles/customer-profiles.service';

@Public()
@Controller('customer/appointments')
@UseGuards(CustomerJwtAuthGuard)
export class CustomerAppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly customerProfiles: CustomerProfilesService,
  ) {}

  @Get()
  async listAppointments(@Auth() auth: AuthContext) {
    const profile = await this.customerProfiles.getByUserId(auth.user_id);
    const appointments = await this.appointments.listAppointmentsForCustomer({
      email: auth.email,
      phone: (profile as any)?.phone,
    });

    return { appointments };
  }

  @Post(':appointmentId/cancel')
  async cancelAppointment(
    @Auth() auth: AuthContext,
    @Param('appointmentId') appointmentId: string,
    @Body() body: { reason?: string },
  ) {
    const profile = await this.customerProfiles.getByUserId(auth.user_id);
    const appointment = await this.appointments.cancelAppointmentAsCustomer(
      {
        email: auth.email,
        phone: (profile as any)?.phone,
      },
      appointmentId,
      body?.reason,
    );

    return { appointment };
  }
}
