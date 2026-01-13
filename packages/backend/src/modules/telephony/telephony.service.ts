import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Company, CompanyStatus, SubscriptionStatus } from '@handycall/shared';
import { CompaniesService } from '../companies/companies.service';
import { CompanyNumbersService } from '../company-numbers/company-numbers.service';

type TwilioAvailableNumber = {
  phoneNumber: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry?: string;
  capabilities?: Record<string, any>;
};

@Injectable()
export class TelephonyService {
  constructor(
    private readonly config: ConfigService,
    private readonly companiesService: CompaniesService,
    private readonly companyNumbersService: CompanyNumbersService,
  ) {}

  private getTwilioAccountSid(): string {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    if (!sid) throw new Error('Missing TWILIO_ACCOUNT_SID');
    return sid;
  }

  private getTwilioAuthToken(): string {
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!token) throw new Error('Missing TWILIO_AUTH_TOKEN');
    return token;
  }

  private getVoiceWebhookUrl(): string {
    return (
      this.config.get<string>('TWILIO_VOICE_WEBHOOK_URL') ||
      this.config.get<string>('VOICE_BRIDGE_VOICE_WEBHOOK_URL') ||
      'https://voice.handycall.org/twilio/voice'
    );
  }

  private twilioAuthHeader(): string {
    const sid = this.getTwilioAccountSid();
    const token = this.getTwilioAuthToken();
    const basic = Buffer.from(`${sid}:${token}`, 'utf8').toString('base64');
    return `Basic ${basic}`;
  }

  private async twilioJson<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Twilio API ${res.status}: ${text}`);
    }
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  /**
   * Get available phone numbers from Twilio.
   * Note: `type` is ignored (legacy AWS Connect parameter).
   */
  async getAvailablePhoneNumbers(
    country: string = 'US',
    _type: string = 'DID',
    maxResults: number = 10,
    filters?: { areaCode?: string; contains?: string },
  ): Promise<TwilioAvailableNumber[]> {
    const accountSid = this.getTwilioAccountSid();
    const cc = (country || 'US').toUpperCase();

    const params = new URLSearchParams();
    params.set('PageSize', String(Math.min(Math.max(maxResults || 10, 1), 50)));
    if (filters?.areaCode) params.set('AreaCode', filters.areaCode);
    if (filters?.contains) params.set('Contains', filters.contains);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${cc}/Local.json?${params.toString()}`;
    const data = await this.twilioJson<any>(url, {
      method: 'GET',
      headers: { Authorization: this.twilioAuthHeader() },
    });

    const list = Array.isArray(data?.available_phone_numbers) ? data.available_phone_numbers : [];
    return list.map((n: any) => ({
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      locality: n.locality,
      region: n.region,
      isoCountry: n.iso_country,
      capabilities: n.capabilities,
    }));
  }

  private ensureSubscriptionActive(company: Company) {
    if (company.status === CompanyStatus.INACTIVE || company.status === CompanyStatus.SUSPENDED) {
      throw new BadRequestException('Account is inactive or suspended.');
    }

    const status = company.subscription_status as SubscriptionStatus | undefined;
    const hasActiveStatus = status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
    const hasActivePlan = Boolean(company.subscription_plan || company.stripe_subscription_id);
    const hasActiveTrial =
      company.trial_ends_at !== null &&
      company.trial_ends_at !== undefined &&
      company.trial_ends_at > Date.now();
    const isCancelingButActive =
      company.cancel_at_period_end && company.current_period_end && company.current_period_end > Date.now();

    const hasSubscription = (hasActivePlan && hasActiveStatus) || hasActiveTrial || isCancelingButActive;
    if (!hasSubscription) {
      throw new BadRequestException('You must have an active subscription or trial to claim a phone number.');
    }
  }

  /**
   * Claim (purchase) a phone number for a company via Twilio.
   *
   * Constraints:
   * - Must have an active subscription/trial
   * - 1 phone number per company
   */
  async claimPhoneNumberForCompany(companyId: string, phoneNumber: string, description?: string) {
    const company = await this.companiesService.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    this.ensureSubscriptionActive(company);

    const existing = await this.companyNumbersService.listCompanyNumbers(companyId);
    const already = existing.find((n) => n.provider === 'TWILIO');
    if (already) {
      throw new BadRequestException(`Company already has a phone number: ${already.did_e164}`);
    }

    const accountSid = this.getTwilioAccountSid();
    const voiceUrl = this.getVoiceWebhookUrl();
    const friendlyName = description || `HandyCall - ${company.company_name}`;

    const form = new URLSearchParams();
    form.set('PhoneNumber', phoneNumber);
    form.set('FriendlyName', friendlyName);
    form.set('VoiceUrl', voiceUrl);
    form.set('VoiceMethod', 'POST');

    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const purchased = await this.twilioJson<any>(purchaseUrl, {
      method: 'POST',
      headers: {
        Authorization: this.twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const did = purchased?.phone_number as string | undefined;
    const sid = purchased?.sid as string | undefined;
    if (!did || !did.startsWith('+') || !sid) {
      throw new Error(`Twilio purchase response missing phone_number/sid: ${JSON.stringify(purchased)}`);
    }

    await this.companyNumbersService.assignDidToCompany({
      did_e164: did,
      company_id: companyId,
      provider: 'TWILIO',
      label: `Twilio - ${company.company_name}`,
    });

    return { phoneNumberSid: sid, phoneNumber: did, companyName: company.company_name, voiceUrl };
  }

  /**
   * Product decision: 1 number per company, claim-once.
   * Keep endpoint for now but do not allow releases.
   */
  async releasePhoneNumberForCompany(_companyId: string) {
    throw new BadRequestException('Releasing phone numbers is not supported. Contact support.');
  }

  async getCompanyPhoneNumber(companyId: string) {
    const company = await this.companiesService.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const numbers = await this.companyNumbersService.listCompanyNumbers(companyId);
    const twilio = numbers.find((n) => n.provider === 'TWILIO') ?? null;
    if (!twilio) return null;

    return { phoneNumber: twilio.did_e164, provider: twilio.provider, label: twilio.label };
  }

  async verifyCompanyPhoneNumber(companyId: string): Promise<boolean> {
    const my = await this.getCompanyPhoneNumber(companyId);
    if (!my?.phoneNumber) return false;

    const accountSid = this.getTwilioAccountSid();
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(
      my.phoneNumber,
    )}`;
    const data = await this.twilioJson<any>(url, {
      method: 'GET',
      headers: { Authorization: this.twilioAuthHeader() },
    });

    const items = Array.isArray(data?.incoming_phone_numbers) ? data.incoming_phone_numbers : [];
    return items.length > 0;
  }

  async listInboundNumbers(companyId: string) {
    return this.companyNumbersService.listCompanyNumbers(companyId);
  }

  async assignInboundNumber(
    companyId: string,
    input: { did_e164: string; provider?: 'CONNECT' | 'TWILIO' | 'OTHER'; label?: string },
  ) {
    return this.companyNumbersService.assignDidToCompany({
      did_e164: input.did_e164,
      company_id: companyId,
      provider: input.provider ?? 'OTHER',
      label: input.label,
    });
  }

  async unassignInboundNumber(companyId: string, didE164: string) {
    return this.companyNumbersService.unassignDid({ did_e164: didE164, company_id: companyId });
  }
}

