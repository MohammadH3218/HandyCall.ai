import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  constructor(private readonly config: ConfigService) {}

  private getAccountSid(): string {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    if (!sid) throw new Error('Missing TWILIO_ACCOUNT_SID');
    return sid;
  }

  private getAuthToken(): string {
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!token) throw new Error('Missing TWILIO_AUTH_TOKEN');
    return token;
  }

  private getSmsSender(): { from?: string; messagingServiceSid?: string } {
    const messagingServiceSid = this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID');
    const from = this.config.get<string>('TWILIO_SMS_FROM');
    if (!messagingServiceSid && !from) {
      throw new Error('Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM');
    }
    return { from, messagingServiceSid };
  }

  async sendSms(toNumber: string, message: string): Promise<{ sid?: string; status?: string; to?: string }> {
    const accountSid = this.getAccountSid();
    const sender = this.getSmsSender();
    const authHeader = `Basic ${Buffer.from(`${accountSid}:${this.getAuthToken()}`, 'utf8').toString('base64')}`;

    const form = new URLSearchParams();
    form.set('To', toNumber);
    form.set('Body', message);
    if (sender.messagingServiceSid) {
      form.set('MessagingServiceSid', sender.messagingServiceSid);
    } else if (sender.from) {
      form.set('From', sender.from);
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`Twilio SMS ${res.status}: ${text}`);
    const data = text ? JSON.parse(text) : {};
    return { sid: data?.sid, status: data?.status, to: data?.to };
  }
}
