import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
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

  @Get('auth/google/url')
  async getGoogleAuthUrl(@CompanyId() companyId: string) {
    const url = await this.calendarService.getGoogleAuthUrl(companyId);
    return { url };
  }

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

  @Get('auth/microsoft/callback')
  async handleMicrosoftCallback(
    @Query('code') code: string,
    @Query('state') state: string
  ) {
    await this.calendarService.handleMicrosoftCallback(code, state);
    return {
      success: true,
      message: 'Microsoft Calendar connected successfully',
      redirectUrl: '/dashboard/appointments?setup=complete'
    };
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
    @Body() body: { email: string; calendarPath?: string }
  ) {
    await this.calendarService.connectAppleCalendar(companyId, body.email, body.calendarPath);
    return {
      success: true,
      message: 'Apple Calendar connected successfully',
    };
  }
}
