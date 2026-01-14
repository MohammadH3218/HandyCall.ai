import { Injectable, OnModuleInit } from '@nestjs/common';
import { ParameterStoreService } from '../../../infrastructure/config/parameter-store.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// CalDAV endpoints for iCloud
const ICALENDAR_BASE = 'https://caldav.icloud.com';

@Injectable()
export class AppleCalendarService {
  /**
   * Get CalDAV URL for a user's calendar
   * Apple iCloud uses CalDAV with app-specific passwords
   */
  getCalDAVUrl(email: string): string {
    // Extract username from email (before @)
    const username = email.split('@')[0];
    return `${ICALENDAR_BASE}/${username}/calendars/`;
  }

  /**
   * Authenticate with CalDAV using user's app-specific password
   */
  private getAuthHeader(email: string, appSpecificPassword: string): string {
    if (!appSpecificPassword) {
      throw new Error('Apple app-specific password is required');
    }
    // Basic auth: email:app-specific-password
    const credentials = Buffer.from(`${email}:${appSpecificPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get calendar list for a user
   */
  async getCalendars(email: string, appSpecificPassword: string): Promise<any[]> {
    try {
      const url = this.getCalDAVUrl(email);
      const response = await axios.request({
        method: 'PROPFIND',
        url,
        headers: {
          'Authorization': this.getAuthHeader(email, appSpecificPassword),
          'Depth': '1',
          'Content-Type': 'application/xml',
        },
        data: `<?xml version="1.0" encoding="UTF-8"?>
          <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
            <d:prop>
              <d:displayname/>
              <c:calendar-description/>
              <d:resourcetype/>
            </d:prop>
          </d:propfind>`,
      });

      // Parse CalDAV response to extract calendar list
      // This is a simplified version - you may need more robust XML parsing
      return this.parseCalendarList(response.data);
    } catch (err: any) {
      console.error('Error fetching Apple Calendar list:', err.response?.data || err.message);
      throw new Error(`Failed to fetch calendars: ${err.message}`);
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
      await this.getCalendars(email, appSpecificPassword);
      return true;
    } catch (err) {
      return false;
    }
  }
}
