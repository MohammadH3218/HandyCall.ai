import { Injectable, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import { ParameterStoreService } from '../../../infrastructure/config/parameter-store.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private oauth2Client: any;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri: string | null = null;

  constructor(
    private parameterStore: ParameterStoreService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize OAuth client with credentials from Parameter Store or env vars
    this.clientId = await this.parameterStore.getGoogleClientId();
    this.clientSecret = await this.parameterStore.getGoogleClientSecret();
    this.redirectUri = await this.parameterStore.getGoogleRedirectUri();

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('[GoogleCalendarService] OAuth credentials not fully configured. Calendar integration may not work.');
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId || '',
      this.clientSecret || '',
      this.redirectUri || ''
    );
  }

  getAuthUrl(companyId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state: companyId, // Pass companyId as state
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  async exchangeCodeForTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async ensureValidTokens(tokens: any): Promise<any> {
    this.oauth2Client.setCredentials(tokens);

    // Check if token is expired
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    }

    return tokens;
  }

  async getEvents(accessToken: string, timeMin: string, timeMax: string): Promise<any[]> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      }));
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err);
      return [];
    }
  }

  async createEvent(accessToken: string, event: any): Promise<any> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end,
          timeZone: 'UTC',
        },
      },
    });

    return response.data;
  }

  async updateEvent(accessToken: string, eventId: string, event: any): Promise<any> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end,
          timeZone: 'UTC',
        },
      },
    });

    return response.data;
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }
}
