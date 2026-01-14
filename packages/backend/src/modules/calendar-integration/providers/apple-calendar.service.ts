import { Injectable, OnModuleInit } from '@nestjs/common';
import { ParameterStoreService } from '../../../infrastructure/config/parameter-store.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// CalDAV endpoints for iCloud
// Apple uses a discovery endpoint to find the actual CalDAV server
const ICALENDAR_DISCOVERY = 'https://caldav.icloud.com';
const ICALENDAR_BASE = 'https://p01-caldav.icloud.com';

@Injectable()
export class AppleCalendarService {
  /**
   * Get CalDAV URL for a user's calendar
   * Apple iCloud uses CalDAV with app-specific passwords
   * The format is: https://p{XX}-caldav.icloud.com/{USER_ID}/calendars/
   * Since we don't have the user ID initially, we use the discovery endpoint
   */
  getCalDAVUrl(email: string): string {
    // Start with the discovery/principal endpoint
    return `${ICALENDAR_DISCOVERY}/`;
  }

  /**
   * Authenticate with CalDAV using user's app-specific password
   */
  private getAuthHeader(email: string, appSpecificPassword: string): string {
    if (!appSpecificPassword) {
      throw new Error('Apple app-specific password is required');
    }
    // Basic auth: email:app-specific-password
    // Remove any hyphens from the app-specific password
    const cleanPassword = appSpecificPassword.replace(/-/g, '');
    const credentials = Buffer.from(`${email}:${cleanPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Discover the user's principal URL
   */
  async discoverPrincipal(email: string, appSpecificPassword: string): Promise<string> {
    try {
      // First, try the .well-known endpoint for discovery
      const response = await axios.request({
        method: 'PROPFIND',
        url: `${ICALENDAR_DISCOVERY}/.well-known/caldav`,
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Depth': '0',
          'Content-Type': 'application/xml; charset=utf-8',
        },
        data: `<?xml version="1.0" encoding="UTF-8"?>
          <d:propfind xmlns:d="DAV:">
            <d:prop>
              <d:current-user-principal/>
            </d:prop>
          </d:propfind>`,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      // Extract principal URL from response
      const principalMatch = response.data.match(/<d:href[^>]*>([^<]+)<\/d:href>/i);
      if (principalMatch) {
        return principalMatch[1];
      }

      // Fallback: try using the email directly
      return `${ICALENDAR_BASE}/${email.split('@')[0]}/calendars/`;
    } catch (err: any) {
      console.error('[AppleCalendarService] Discovery failed:', err.message);
      // Fallback URL
      return `${ICALENDAR_BASE}/`;
    }
  }

  /**
   * Get calendar list for a user
   */
  async getCalendars(email: string, appSpecificPassword: string): Promise<any[]> {
    try {
      // Try direct calendar access first
      const calendarsUrl = `${ICALENDAR_BASE}/${email}/calendars/`;

      const response = await axios.request({
        method: 'PROPFIND',
        url: calendarsUrl,
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
        },
        data: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <c:calendar-description/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid credentials. Please ensure you are using an app-specific password generated at appleid.apple.com');
      }

      // Parse CalDAV response to extract calendar list
      return this.parseCalendarList(response.data);
    } catch (err: any) {
      console.error('[AppleCalendarService] Error fetching calendars:', {
        status: err.response?.status,
        message: err.message,
        data: err.response?.data?.substring?.(0, 500),
      });

      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('Invalid Apple Calendar credentials. Please check your email and app-specific password.');
      }

      throw new Error(`Failed to connect to Apple Calendar: ${err.message}`);
    }
  }

  /**
   * Get events from a calendar
   */
  async getEvents(email: string, appSpecificPassword: string, calendarPath: string, timeMin: string, timeMax: string): Promise<any[]> {
    try {
      const url = `${ICALENDAR_BASE}${calendarPath}`;
      
      // CalDAV REPORT request to query events
      const response = await axios.request({
        method: 'REPORT',
        url,
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Depth': '1',
          'Content-Type': 'application/xml',
        },
        data: `<?xml version="1.0" encoding="UTF-8"?>
          <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
            <d:prop>
              <d:getetag/>
              <c:calendar-data/>
            </d:prop>
            <c:filter>
              <c:comp-filter name="VCALENDAR">
                <c:comp-filter name="VEVENT">
                  <c:time-range start="${this.formatCalDAVDate(timeMin)}" end="${this.formatCalDAVDate(timeMax)}"/>
                </c:comp-filter>
              </c:comp-filter>
            </c:filter>
          </c:calendar-query>`,
      });

      return this.parseEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching Apple Calendar events:', err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Create an event in a calendar
   */
  async createEvent(email: string, appSpecificPassword: string, calendarPath: string, event: any): Promise<any> {
    try {
      const eventId = `event-${Date.now()}.ics`;
      const url = `${ICALENDAR_BASE}${calendarPath}${eventId}`;
      
      const ical = this.generateICalendar(event);
      
      const response = await axios.put(url, ical, {
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Content-Type': 'text/calendar; charset=utf-8',
        },
      });

      return { id: eventId, url: response.headers.location || url };
    } catch (err: any) {
      console.error('Error creating Apple Calendar event:', err.response?.data || err.message);
      throw new Error(`Failed to create event: ${err.message}`);
    }
  }

  /**
   * Update an event
   */
  async updateEvent(email: string, appSpecificPassword: string, calendarPath: string, eventId: string, event: any): Promise<any> {
    try {
      const url = `${ICALENDAR_BASE}${calendarPath}${eventId}`;
      const ical = this.generateICalendar(event);
      
      await axios.put(url, ical, {
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Content-Type': 'text/calendar; charset=utf-8',
        },
      });

      return { id: eventId };
    } catch (err: any) {
      console.error('Error updating Apple Calendar event:', err.response?.data || err.message);
      throw new Error(`Failed to update event: ${err.message}`);
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(email: string, appSpecificPassword: string, calendarPath: string, eventId: string): Promise<void> {
    try {
      const url = `${ICALENDAR_BASE}${calendarPath}${eventId}`;
      await axios.delete(url, {
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
        },
      });
    } catch (err: any) {
      console.error('Error deleting Apple Calendar event:', err.response?.data || err.message);
      throw new Error(`Failed to delete event: ${err.message}`);
    }
  }

  /**
   * Parse calendar list from CalDAV PROPFIND response
   */
  private parseCalendarList(xmlData: string): any[] {
    // Simplified parsing - in production, use a proper XML parser
    const calendars: any[] = [];
    // This is a basic implementation - you may want to use xml2js or similar
    const regex = /<d:href>([^<]+)<\/d:href>/g;
    let match;
    while ((match = regex.exec(xmlData)) !== null) {
      const path = match[1];
      if (path && !path.endsWith('/') && path.includes('/calendars/')) {
        calendars.push({
          id: path.split('/').pop(),
          path: path,
          name: path.split('/').pop() || 'Calendar',
        });
      }
    }
    return calendars.length > 0 ? calendars : [{ id: 'primary', path: '/calendars/', name: 'Calendar' }];
  }

  /**
   * Parse events from CalDAV REPORT response
   */
  private parseEvents(xmlData: string): any[] {
    const events: any[] = [];
    // Extract iCalendar data from XML
    const icalRegex = /<c:calendar-data><!\[CDATA\[([\s\S]*?)\]\]><\/c:calendar-data>/g;
    let match;
    
    while ((match = icalRegex.exec(xmlData)) !== null) {
      const icalData = match[1];
      const event = this.parseICalendar(icalData);
      if (event) {
        events.push(event);
      }
    }
    
    return events;
  }

  /**
   * Parse iCalendar format
   */
  private parseICalendar(icalData: string): any | null {
    try {
      const lines = icalData.split('\n');
      let summary = '';
      let start = '';
      let end = '';
      let description = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('SUMMARY:')) {
          summary = line.substring(8);
        } else if (line.startsWith('DTSTART')) {
          const dateMatch = line.match(/DTSTART[^:]*:(.+)/);
          if (dateMatch) start = dateMatch[1];
        } else if (line.startsWith('DTEND')) {
          const dateMatch = line.match(/DTEND[^:]*:(.+)/);
          if (dateMatch) end = dateMatch[1];
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12);
        }
      }
      
      if (!start) return null;
      
      return {
        id: `apple-${Date.now()}`,
        summary,
        description,
        start: this.parseICalendarDate(start),
        end: this.parseICalendarDate(end),
      };
    } catch (err) {
      console.error('Error parsing iCalendar:', err);
      return null;
    }
  }

  /**
   * Generate iCalendar format from event data
   */
  private generateICalendar(event: any): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `handycall-${Date.now()}@handycall.org`;
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HandyCall//Calendar Integration//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.summary || 'Appointment'}
DESCRIPTION:${event.description || ''}
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Format date for CalDAV time-range
   */
  private formatCalDAVDate(isoDate: string): string {
    return new Date(isoDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Parse iCalendar date format
   */
  private parseICalendarDate(dateStr: string): string {
    // iCalendar dates can be in format YYYYMMDDTHHMMSSZ or YYYYMMDD
    if (dateStr.length === 8) {
      // Date only
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T00:00:00Z`;
    } else if (dateStr.includes('T')) {
      // Date-time
      const cleaned = dateStr.replace(/[TZ]/g, '');
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}T${cleaned.substring(8, 10)}:${cleaned.substring(10, 12)}:${cleaned.substring(12, 14)}Z`;
    }
    return new Date().toISOString();
  }

  /**
   * Ensure valid connection (test authentication)
   */
  async testConnection(email: string, appSpecificPassword: string): Promise<boolean> {
    try {
      // Clean the password (remove hyphens)
      const cleanPassword = appSpecificPassword.replace(/-/g, '');

      // Try to access the principal URL to verify credentials
      const response = await axios.request({
        method: 'OPTIONS',
        url: `${ICALENDAR_DISCOVERY}`,
        headers: {
          'Authorization': this.getAuthHeader(email, cleanPassword),
        },
        validateStatus: (status) => status < 500,
        timeout: 10000,
      });

      // If we get a 200/207, credentials are valid
      if (response.status === 200 || response.status === 207) {
        return true;
      }

      // Try PROPFIND as a fallback test
      const propfindResponse = await axios.request({
        method: 'PROPFIND',
        url: `${ICALENDAR_DISCOVERY}/`,
        headers: {
          'Authorization': this.getAuthHeader(email, cleanPassword),
          'Depth': '0',
          'Content-Type': 'application/xml; charset=utf-8',
        },
        data: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`,
        validateStatus: (status) => status < 500,
        timeout: 10000,
      });

      return propfindResponse.status === 207 || propfindResponse.status === 200;
    } catch (err: any) {
      console.error('[AppleCalendarService] Test connection failed:', err.message);
      return false;
    }
  }
}
