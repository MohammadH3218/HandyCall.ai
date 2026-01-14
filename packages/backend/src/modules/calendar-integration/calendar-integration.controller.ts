import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CompanyId } from '../../common/decorators/auth.decorator';
import { CalendarIntegrationService } from './calendar-integration.service';

@Controller('calendar-integration')
export class CalendarIntegrationController {
  constructor(private calendarService: CalendarIntegrationService) {}

  @Get('providers')
  async getAvailableProviders() {
    return {
      providers: [
        { id: 'GOOGLE', name: 'Google Calendar', available: true },
        { id: 'MICROSOFT', name: 'Outlook/Microsoft 365', available: true },
        { id: 'APPLE', name: 'Apple iCloud', available: true },
      ],
    };
  }

  @Public()
  @Get('test')
  async testEndpoint() {
    return {
      message: 'Calendar integration endpoints are accessible',
      timestamp: Date.now(),
    };
  }

  @Get('auth/google/url')
  async getGoogleAuthUrl(@CompanyId() companyId: string) {
    const url = await this.calendarService.getGoogleAuthUrl(companyId);
    return { url };
  }

  @Public()
  @Get('auth/google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string
  ) {
    await this.calendarService.handleGoogleCallback(code, state);
    return {
      success: true,
      message: 'Google Calendar connected successfully',
      redirectUrl: '/dashboard/appointments?setup=complete'
    };
  }

  @Get('auth/microsoft/url')
  async getMicrosoftAuthUrl(@CompanyId() companyId: string) {
    const url = await this.calendarService.getMicrosoftAuthUrl(companyId);
    return { url };
  }

  @Public()
  @Get('auth/microsoft/callback')
  async handleMicrosoftCallback(
    @Query('code') code: string,
    @Query('state') state: string
  ) {
    console.log(`[CalendarIntegrationController] Microsoft callback received - code: ${code ? 'PRESENT' : 'MISSING'}, state: ${state || 'MISSING'}`);
    
    if (!code) {
      console.error('[CalendarIntegrationController] Missing authorization code in callback');
      throw new Error('Authorization code is required');
    }

    if (!state) {
      console.error('[CalendarIntegrationController] Missing state (companyId) in callback');
      throw new Error('State parameter (companyId) is required');
    }

    try {
      await this.calendarService.handleMicrosoftCallback(code, state);
      console.log(`[CalendarIntegrationController] Microsoft Calendar connected successfully for company: ${state}`);
      return {
        success: true,
        message: 'Microsoft Calendar connected successfully',
        redirectUrl: '/dashboard/appointments?setup=complete'
      };
    } catch (error: any) {
      console.error('[CalendarIntegrationController] Error handling Microsoft callback:', error);
      console.error('[CalendarIntegrationController] Error details:', {
        message: error.message,
        stack: error.stack,
        code: code ? 'PRESENT' : 'MISSING',
        state: state || 'MISSING'
      });
      throw error;
    }
  }

  @Post('sync')
  async syncCalendar(@CompanyId() companyId: string) {
    await this.calendarService.syncCalendar(companyId);
    return { success: true, message: 'Calendar sync initiated' };
  }

  @Get('status')
  async getConnectionStatus(@CompanyId() companyId: string) {
    return this.calendarService.getConnectionStatus(companyId);
  }

  @Post('disconnect')
  async disconnectCalendar(@CompanyId() companyId: string) {
    await this.calendarService.disconnectCalendar(companyId);
    return { success: true, message: 'Calendar disconnected' };
  }

  @Post('auth/apple/connect')
  async connectAppleCalendar(
    @CompanyId() companyId: string,
    @Body() body: { email: string; appSpecificPassword: string; calendarPath?: string }
  ) {
    console.log(`[CalendarIntegrationController] Apple connect request - companyId: ${companyId ? 'PRESENT' : 'MISSING'}, email: ${body?.email ? 'PRESENT' : 'MISSING'}`);
    
    if (!companyId) {
      console.error('[CalendarIntegrationController] Company ID missing from request');
      throw new Error('Company ID is required. Please ensure you are authenticated.');
    }

    if (!body?.email || !body?.appSpecificPassword) {
      throw new Error('Email and app-specific password are required');
    }

    await this.calendarService.connectAppleCalendar(companyId, body.email, body.appSpecificPassword, body.calendarPath);
    return {
      success: true,
      message: 'Apple Calendar connected successfully',
    };
  }
}
