import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from '../companies/companies.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { GoogleCalendarService } from './providers/google-calendar.service';
import { MicrosoftCalendarService } from './providers/microsoft-calendar.service';
import { AppleCalendarService } from './providers/apple-calendar.service';

@Injectable()
export class CalendarIntegrationService {
  constructor(
    private companiesService: CompaniesService,
    private appointmentsService: AppointmentsService,
    private googleCalendar: GoogleCalendarService,
    private microsoftCalendar: MicrosoftCalendarService,
    private appleCalendar: AppleCalendarService,
  ) {}

  async getGoogleAuthUrl(companyId: string): Promise<string> {
    return this.googleCalendar.getAuthUrl(companyId);
  }

  async handleGoogleCallback(code: string, state: string): Promise<void> {
    const companyId = state; // State contains companyId
    const tokens = await this.googleCalendar.exchangeCodeForTokens(code);

    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'GOOGLE',
      calendar_mode: 'EXTERNAL',
      calendar_connection: {
        provider: 'GOOGLE',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        connected_at: Date.now(),
      },
      calendar_setup_completed: true,
    });

    // Initial sync
    await this.syncCalendar(companyId);
  }

  async getMicrosoftAuthUrl(companyId: string): Promise<string> {
    return this.microsoftCalendar.getAuthUrl(companyId);
  }

  async handleMicrosoftCallback(code: string, state: string): Promise<void> {
    const companyId = state; // State contains companyId
    const tokens = await this.microsoftCalendar.exchangeCodeForTokens(code);

    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'MICROSOFT',
      calendar_mode: 'EXTERNAL',
      calendar_connection: {
        provider: 'MICROSOFT',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        connected_at: Date.now(),
      },
      calendar_setup_completed: true,
    });

    // Initial sync
    await this.syncCalendar(companyId);
  }

  async syncCalendar(companyId: string): Promise<void> {
    const company = await this.companiesService.findById(companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.calendar_connection || company.calendar_mode !== 'EXTERNAL') {
      throw new BadRequestException('No external calendar connected');
    }

    const provider = company.calendar_provider;

    if (provider === 'GOOGLE') {
      await this.syncGoogleCalendar(companyId, company);
    } else if (provider === 'MICROSOFT') {
      await this.syncMicrosoftCalendar(companyId, company);
    } else if (provider === 'APPLE') {
      await this.syncAppleCalendar(companyId, company);
    } else {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  private async syncGoogleCalendar(companyId: string, company: any): Promise<void> {
    const tokens = company.calendar_connection;

    // Refresh token if needed
    const validTokens = await this.googleCalendar.ensureValidTokens(tokens);
    if (validTokens !== tokens) {
      await this.companiesService.updateCompany(companyId, {
        calendar_connection: { ...company.calendar_connection, ...validTokens },
      });
    }

    // Pull events from Google Calendar
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180); // 6 months

    const events = await this.googleCalendar.getEvents(
      validTokens.access_token,
      now.toISOString(),
      futureDate.toISOString()
    );

    // Import events into our system (mark them as synced from external)
    for (const event of events) {
      try {
        await this.appointmentsService.createAppointment(companyId, {
          scheduled_start: new Date(event.start).getTime(),
          scheduled_end: new Date(event.end).getTime(),
          contact_name: event.summary || 'External Event',
          service_type: 'Synced from Google Calendar',
          notes: event.description,
          created_by: 'USER',
        } as any);
      } catch (err) {
        console.error('Error importing event:', err);
      }
    }
  }

  private async syncMicrosoftCalendar(companyId: string, company: any): Promise<void> {
    const tokens = company.calendar_connection;

    // Refresh token if needed
    const validTokens = await this.microsoftCalendar.ensureValidTokens(tokens);
    if (validTokens !== tokens) {
      await this.companiesService.updateCompany(companyId, {
        calendar_connection: { ...company.calendar_connection, ...validTokens },
      });
    }

    // Pull events from Microsoft Calendar
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180); // 6 months

    const events = await this.microsoftCalendar.getEvents(
      validTokens.access_token,
      now.toISOString(),
      futureDate.toISOString()
    );

    // Import events into our system
    for (const event of events) {
      try {
        await this.appointmentsService.createAppointment(companyId, {
          scheduled_start: new Date(event.start).getTime(),
          scheduled_end: new Date(event.end).getTime(),
          contact_name: event.summary || 'External Event',
          service_type: 'Synced from Microsoft Calendar',
          notes: event.description,
          created_by: 'USER',
        } as any);
      } catch (err) {
        console.error('Error importing event:', err);
      }
    }
  }

  async getConnectionStatus(companyId: string) {
    const company = await this.companiesService.findById(companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      connected: company.calendar_mode === 'EXTERNAL' && !!company.calendar_connection,
      provider: company.calendar_provider || null,
      connectedAt: company.calendar_connection?.connected_at || null,
    };
  }

  async disconnectCalendar(companyId: string): Promise<void> {
    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'NONE',
      calendar_mode: 'INTERNAL',
      calendar_connection: null,
    });
  }

  async pushEventToExternalCalendar(companyId: string, appointment: any): Promise<void> {
    const company = await this.companiesService.findById(companyId);

    if (!company || !company.calendar_connection || company.calendar_mode !== 'EXTERNAL') {
      return; // No external calendar connected, skip push
    }

    const provider = company.calendar_provider;
    const tokens = company.calendar_connection;

    try {
      if (provider === 'GOOGLE') {
        const validTokens = await this.googleCalendar.ensureValidTokens(tokens);
        await this.googleCalendar.createEvent(validTokens.access_token, {
          summary: `${appointment.contact_name || 'Appointment'} - ${appointment.service_type}`,
          description: appointment.notes,
          start: new Date(appointment.scheduled_start).toISOString(),
          end: new Date(appointment.scheduled_end).toISOString(),
        });
      } else if (provider === 'MICROSOFT') {
        const validTokens = await this.microsoftCalendar.ensureValidTokens(tokens);
        await this.microsoftCalendar.createEvent(validTokens.access_token, {
          summary: `${appointment.contact_name || 'Appointment'} - ${appointment.service_type}`,
          description: appointment.notes,
          start: new Date(appointment.scheduled_start).toISOString(),
          end: new Date(appointment.scheduled_end).toISOString(),
        });
      } else if (provider === 'APPLE') {
        const email = tokens.email || company.calendar_connection?.email;
        const calendarPath = tokens.calendar_path || '/calendars/';
        if (email) {
          await this.appleCalendar.createEvent(email, calendarPath, {
            summary: `${appointment.contact_name || 'Appointment'} - ${appointment.service_type}`,
            description: appointment.notes,
            start: new Date(appointment.scheduled_start).toISOString(),
            end: new Date(appointment.scheduled_end).toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Error pushing event to external calendar:', err);
      // Don't fail the appointment creation if external push fails
    }
  }

  async connectAppleCalendar(companyId: string, email: string, calendarPath?: string): Promise<void> {
    // Test connection first
    const isValid = await this.appleCalendar.testConnection(email);
    if (!isValid) {
      throw new BadRequestException('Invalid Apple Calendar credentials. Please check your email and app-specific password.');
    }

    // Get default calendar if not provided
    if (!calendarPath) {
      const calendars = await this.appleCalendar.getCalendars(email);
      calendarPath = calendars[0]?.path || '/calendars/';
    }

    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'APPLE',
      calendar_mode: 'EXTERNAL',
      calendar_connection: {
        provider: 'APPLE',
        email: email,
        calendar_path: calendarPath,
        connected_at: Date.now(),
      },
      calendar_setup_completed: true,
    });

    // Initial sync
    await this.syncCalendar(companyId);
  }

  private async syncAppleCalendar(companyId: string, company: any): Promise<void> {
    const connection = company.calendar_connection;
    const email = connection.email;
    const calendarPath = connection.calendar_path || '/calendars/';

    if (!email) {
      throw new BadRequestException('Apple Calendar email not configured');
    }

    // Pull events from Apple Calendar
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180); // 6 months

    const events = await this.appleCalendar.getEvents(
      email,
      calendarPath,
      now.toISOString(),
      futureDate.toISOString()
    );

    // Import events into our system
    for (const event of events) {
      try {
        await this.appointmentsService.createAppointment(companyId, {
          scheduled_start: new Date(event.start).getTime(),
          scheduled_end: new Date(event.end).getTime(),
          contact_name: event.summary || 'External Event',
          service_type: 'Synced from Apple Calendar',
          notes: event.description,
          created_by: 'USER',
        } as any);
      } catch (err) {
        console.error('Error importing event:', err);
      }
    }
  }
}
