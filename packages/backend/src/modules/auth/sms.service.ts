import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  constructor(private configService: ConfigService) {}

  private getAccountSid(): string {
    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    if (!sid) throw new BadRequestException('Missing TWILIO_ACCOUNT_SID');
    return sid;
  }

  private getAuthToken(): string {
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (!token) throw new BadRequestException('Missing TWILIO_AUTH_TOKEN');
    return token;
  }

  private getSender(): { from?: string; messagingServiceSid?: string } {
    const messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID');
    const from = this.configService.get<string>('TWILIO_SMS_FROM');
    if (!messagingServiceSid && !from) {
      throw new BadRequestException('Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM');
    }
    return { from, messagingServiceSid };
  }

  private authHeader(): string {
    const basic = Buffer.from(`${this.getAccountSid()}:${this.getAuthToken()}`, 'utf8').toString('base64');
    return `Basic ${basic}`;
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    const accountSid = this.getAccountSid();
    const sender = this.getSender();

    const form = new URLSearchParams();
    form.set('To', phoneNumber);
    form.set('Body', message);
    if (sender.messagingServiceSid) {
      form.set('MessagingServiceSid', sender.messagingServiceSid);
    } else if (sender.from) {
      form.set('From', sender.from);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[SmsService] Twilio error:', res.status, text);
      throw new BadRequestException(`Failed to send SMS: ${text}`);
    }
  }
}
