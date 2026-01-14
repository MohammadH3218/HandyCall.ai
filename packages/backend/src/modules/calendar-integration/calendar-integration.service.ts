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
    try {
      return await this.googleCalendar.getAuthUrl(companyId);
    } catch (error: any) {
      console.error('[CalendarIntegrationService] Error getting Google auth URL:', error);
      throw new BadRequestException(`Failed to generate Google OAuth URL: ${error.message}`);
    }
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
    try {
      return await this.microsoftCalendar.getAuthUrl(companyId);
    } catch (error: any) {
      console.error('[CalendarIntegrationService] Error getting Microsoft auth URL:', error);
      throw new BadRequestException(`Failed to generate Microsoft OAuth URL: ${error.message}`);
    }
  }

  async handleMicrosoftCallback(code: string, state: string): Promise<void> {
    const companyId = state; // State contains companyId
    
    console.log(`[CalendarIntegrationService] Handling Microsoft callback for company: ${companyId}`);
    
    if (!companyId) {
      throw new Error('Company ID (state) is required');
    }

    // Verify company exists
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      console.error(`[CalendarIntegrationService] Company not found: ${companyId}`);
      throw new NotFoundException(`Company not found: ${companyId}`);
    }

    console.log(`[CalendarIntegrationService] Exchanging authorization code for tokens...`);
    let tokens;
    try {
      tokens = await this.microsoftCalendar.exchangeCodeForTokens(code);
      console.log(`[CalendarIntegrationService] Token exchange successful - access_token: ${tokens.access_token ? 'PRESENT' : 'MISSING'}, refresh_token: ${tokens.refresh_token ? 'PRESENT' : 'MISSING'}`);
    } catch (error: any) {
      console.error(`[CalendarIntegrationService] Failed to exchange code for tokens:`, error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }

    console.log(`[CalendarIntegrationService] Updating company calendar connection...`);
    try {
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
      console.log(`[CalendarIntegrationService] Company calendar connection updated successfully`);
    } catch (error: any) {
      console.error(`[CalendarIntegrationService] Failed to update company:`, error);
      throw new Error(`Failed to save calendar connection: ${error.message}`);
    }

    // Initial sync (don't fail if sync fails - connection is still successful)
    console.log(`[CalendarIntegrationService] Starting initial calendar sync...`);
    try {
      await this.syncCalendar(companyId);
      console.log(`[CalendarIntegrationService] Initial sync completed successfully`);
    } catch (error: any) {
      console.warn(`[CalendarIntegrationService] Initial sync failed (non-critical):`, error);
      // Don't throw - connection is still successful even if sync fails
    }
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

    // If no external calendar is connected, return disconnected status
    if (company.calendar_mode !== 'EXTERNAL' || !company.calendar_connection) {
      return {
        connected: false,
        provider: null,
        connectedAt: null,
      };
    }

    // Verify the connection is still valid by testing the access token
    try {
      await this.verifyConnection(companyId, company);
      
      return {
        connected: true,
        provider: company.calendar_provider || null,
        connectedAt: company.calendar_connection?.connected_at || null,
      };
    } catch (error: any) {
      // Connection is invalid (permissions revoked, token expired, etc.)
      console.warn(`[CalendarIntegrationService] Connection verification failed for company ${companyId}:`, error.message);
      
      // Auto-disconnect the invalid connection
      await this.disconnectCalendar(companyId);
      
      return {
        connected: false,
        provider: null,
        connectedAt: null,
      };
    }
  }

  private async verifyConnection(companyId: string, company: any): Promise<void> {
    const provider = company.calendar_provider;
    const tokens = company.calendar_connection;

    if (!tokens || !provider) {
      throw new Error('No calendar connection to verify');
    }

    try {
      if (provider === 'GOOGLE') {
        // Try to refresh/validate the token - this will fail if permissions are revoked
        const validTokens = await this.googleCalendar.ensureValidTokens(tokens);
        // If we get here, token is valid - test by making a minimal API call
        await this.googleCalendar.getEvents(
          validTokens.access_token,
          new Date().toISOString(),
          new Date(Date.now() + 86400000).toISOString() // Next 24 hours
        );
      } else if (provider === 'MICROSOFT') {
        // Try to refresh/validate the token - this will fail if permissions are revoked
        const validTokens = await this.microsoftCalendar.ensureValidTokens(tokens);
        // If we get here, token is valid - test by making a minimal API call
        await this.microsoftCalendar.getEvents(
          validTokens.access_token,
          new Date().toISOString(),
          new Date(Date.now() + 86400000).toISOString() // Next 24 hours
        );
      } else if (provider === 'APPLE') {
        // For Apple, test the connection directly
        const email = tokens.email;
        const appSpecificPassword = tokens.app_specific_password;
        if (!email || !appSpecificPassword) {
          throw new Error('Apple Calendar credentials missing');
        }
        const isValid = await this.appleCalendar.testConnection(email, appSpecificPassword);
        if (!isValid) {
          throw new Error('Apple Calendar connection test failed');
        }
      }
    } catch (error: any) {
      // Check if it's an authentication/authorization error (permissions revoked)
      const errorMessage = error.message?.toLowerCase() || '';
      const errorResponse = error.response?.data || {};
      const statusCode = error.response?.status;
      
      // Common indicators of revoked permissions:
      // - 401 Unauthorized
      // - 403 Forbidden
      // - "invalid_grant" (OAuth token revoked)
      // - "invalid_token" (token invalid)
      // - "insufficient_privileges" (permissions revoked)
      if (
        statusCode === 401 ||
        statusCode === 403 ||
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('invalid_token') ||
        errorMessage.includes('insufficient_privileges') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorResponse.error === 'invalid_grant' ||
        errorResponse.error === 'invalid_token'
      ) {
        console.warn(`[CalendarIntegrationService] Permissions appear to be revoked for ${provider} calendar`);
        throw new Error('Calendar permissions revoked');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async disconnectCalendar(companyId: string): Promise<void> {
    console.log(`[CalendarIntegrationService] Disconnecting calendar for company: ${companyId}`);
    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'NONE',
      calendar_mode: 'INTERNAL',
      calendar_connection: null,
      calendar_setup_completed: false, // Reset setup so user sees setup screen again
    });
    console.log(`[CalendarIntegrationService] Calendar disconnected and setup reset for company: ${companyId}`);
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
        const appSpecificPassword = tokens.app_specific_password || company.calendar_connection?.app_specific_password;
        const calendarPath = tokens.calendar_path || '/calendars/';
        if (email && appSpecificPassword) {
          await this.appleCalendar.createEvent(email, appSpecificPassword, calendarPath, {
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

  async connectAppleCalendar(companyId: string, email: string, appSpecificPassword: string, calendarPath?: string): Promise<void> {
    // Test connection first with user's credentials
    const isValid = await this.appleCalendar.testConnection(email, appSpecificPassword);
    if (!isValid) {
      throw new BadRequestException('Invalid Apple Calendar credentials. Please check your email and app-specific password.');
    }

    // Get default calendar if not provided
    if (!calendarPath) {
      const calendars = await this.appleCalendar.getCalendars(email, appSpecificPassword);
      calendarPath = calendars[0]?.path || '/calendars/';
    }

    await this.companiesService.updateCompany(companyId, {
      calendar_provider: 'APPLE',
      calendar_mode: 'EXTERNAL',
      calendar_connection: {
        provider: 'APPLE',
        email: email,
        app_specific_password: appSpecificPassword, // Store user's password securely
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
    const appSpecificPassword = connection.app_specific_password;
    const calendarPath = connection.calendar_path || '/calendars/';

    if (!email || !appSpecificPassword) {
      throw new BadRequestException('Apple Calendar email and app-specific password not configured');
    }

    // Pull events from Apple Calendar
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180); // 6 months

    const events = await this.appleCalendar.getEvents(
      email,
      appSpecificPassword,
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
