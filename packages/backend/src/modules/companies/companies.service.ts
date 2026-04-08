import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import {
  Company,
  CompanyStatus,
  ServiceType,
  BusinessHours,
  SubscriptionPlan,
  SubscriptionStatus,
  AppointmentCancellationPolicy,
} from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import { resolveServiceTemplateId } from './service-template-map';

export interface CompanyStats {
  total_users: number;
  total_contacts: number;
  total_appointments: number;
  revenue?: number;
}

export interface CompanyListItem extends Company {
  stats?: CompanyStats;
}

@Injectable()
export class CompaniesService {
  private readonly tableName = 'companies';
  private readonly deletionAuditTableName = 'deleted_accounts';

  constructor(
    private dynamodb: DynamoDBService,
    private s3Service: S3Service
  ) {}

  private buildBookingFromEmail(companyName: string, companyId: string): string {
    const domain =
      process.env.BOOKING_EMAIL_DOMAIN || process.env.SES_FROM_DOMAIN || 'handycall.org';
    const slug = String(companyName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const local = `no-reply+${slug || companyId}`;
    return `${local}@${domain}`;
  }

  getCompanySelectionScore(company: Partial<Company> | null | undefined): number {
    if (!company) return 0;

    let score = 0;

    if (company.status === CompanyStatus.ACTIVE) score += 1000;
    if (company.subscription_status === SubscriptionStatus.ACTIVE) score += 600;
    if (company.subscription_status === SubscriptionStatus.TRIALING) score += 400;
    if (company.subscription_plan) score += 250;
    if (company.stripe_subscription_id) score += 200;
    if (company.stripe_connect_account_id) score += 150;
    if (company.company_profile_completed) score += 100;
    if (company.service_area_completed) score += 75;
    if (company.calendar_setup_completed) score += 75;
    if (company.booking_payment_mode_confirmed) score += 50;

    return score;
  }

  pickPreferredCompany(companies: Company[]): Company | null {
    if (!Array.isArray(companies) || companies.length === 0) return null;

    return [...companies].sort((a, b) => {
      const scoreDiff =
        this.getCompanySelectionScore(b) - this.getCompanySelectionScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const updatedDiff = Number(b.updated_at || 0) - Number(a.updated_at || 0);
      if (updatedDiff !== 0) return updatedDiff;

      return Number(b.created_at || 0) - Number(a.created_at || 0);
    })[0];
  }

  async findByName(companyName: string): Promise<Company | null> {
    // Case-insensitive match via scan (tables are small enough for admin operations)
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: 'contains(#name, :name)',
      expressionAttributeNames: { '#name': 'company_name' },
      expressionAttributeValues: { ':name': companyName },
      limit: 5,
    });

    return (
      (result.items.find(
        (item: any) => item.company_name?.toLowerCase() === companyName.toLowerCase()
      ) as Company | null) ?? null
    );
  }

  async createCompany(
    companyName: string,
    serviceType: ServiceType,
    email: string,
    phoneNumber: string | undefined,
    timezone: string,
    options?: {
      allowExisting?: boolean;
      companyProfileCompleted?: boolean;
      serviceAreaCompleted?: boolean;
      serviceAreaZipcodes?: string[];
      serviceAreaCities?: string[];
    }
  ): Promise<Company> {
    // Collect conflicts to report them all at once
    const conflicts: Record<string, string> = {};

    // Check if company with email already exists
    const existingByEmail = await this.findByEmail(email);
    if (existingByEmail) {
      if (options?.allowExisting) return existingByEmail;
      conflicts.email = 'Company with this email already exists';
    }

    // Check if company with phone already exists (optional at account creation)
    if (phoneNumber) {
      const existingByPhone = await this.findByPhone(phoneNumber);
      if (existingByPhone) {
        if (options?.allowExisting) return existingByPhone;
        conflicts.phone_number = 'Company with this phone number already exists';
      }
    }

    // Check company name uniqueness (case-insensitive)
    const existingByName = await this.findByName(companyName);
    if (existingByName) {
      if (options?.allowExisting) return existingByName;
      conflicts.company_name = 'Company with this name already exists';
    }

    if (Object.keys(conflicts).length > 0) {
      throw new ConflictException({
        message: 'Company already exists',
        fields: conflicts,
      });
    }

    const companyId = uuidv4();
    const timestamp = Date.now();
    const bookingAlias = this.buildBookingFromEmail(companyName, companyId);

    // Default business hours (M-F 9-5)
    const defaultBusinessHours: BusinessHours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
    };

    const company: Company = {
      company_id: companyId,
      company_name: companyName,
      service_type: serviceType,
      service_template_id: resolveServiceTemplateId(serviceType),
      ...(phoneNumber ? { phone_number: phoneNumber } : {}),
      email,
      booking_from_email: bookingAlias,
      email_from: bookingAlias,
      status: CompanyStatus.INACTIVE,
      timezone,
      business_hours: defaultBusinessHours,
      service_area_zipcodes: options?.serviceAreaZipcodes ?? [],
      service_area_cities: options?.serviceAreaCities ?? [],
      company_profile_completed: options?.companyProfileCompleted ?? false,
      service_area_completed: options?.serviceAreaCompleted ?? false,
      created_at: timestamp,
      updated_at: timestamp,
      calls_enabled: false, // Start disabled until a plan is active
      sms_enabled: false, // Start disabled until a plan is active
      calendar_setup_completed: false,
      schedule_setup_completed: false,
      appointment_cancellation_policy: {
        mode: 'ANYTIME',
      },
      calendar_mode: 'INTERNAL',
      calendar_provider: 'NONE',
      stripe_connect_onboarding_complete: false,
      booking_payment_enabled: false,
      booking_payment_mode: 'SELF_MANAGED',
      booking_payment_mode_confirmed: false,
      booking_services: [],
      follow_up_sequences_enabled: false,
      follow_up_initial_delay_minutes: 0,
      follow_up_second_delay_minutes: 24 * 60,
      follow_up_final_delay_minutes: 3 * 24 * 60,
      review_request_enabled: false,
      review_request_delay_minutes: 120,
      website_widget_enabled: false,
    };

    await this.dynamodb.put(this.tableName, company);

    return company;
  }

  async findById(companyId: string): Promise<Company | null> {
    const company = await this.dynamodb.get(this.tableName, { company_id: companyId });
    if (!company) return null;
    const finalized = await this.finalizeExpiredCancellation(company as Company);
    const normalized = await this.normalizeNoPlanStatus(finalized);
    if (!normalized.email_from && normalized.booking_from_email) {
      normalized.email_from = normalized.booking_from_email;
    }
    return normalized;
  }

  async findByEmail(email: string): Promise<Company | null> {
    // Production email index uses company_id as the partition key; safest is a filtered scan by email.
    // Some accounts have duplicate placeholder companies, so prefer the active/subscribed record.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#email = :email',
      expressionAttributeNames: { '#email': 'email' },
      expressionAttributeValues: { ':email': email },
    });

    return this.pickPreferredCompany((result.items || []) as Company[]);
  }

  async findByPhone(phoneNumber: string): Promise<Company | null> {
    // Phone index keys differ between environments; use filtered scan to avoid key schema issues.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#phone_number = :phone_number',
      expressionAttributeNames: { '#phone_number': 'phone_number' },
      expressionAttributeValues: { ':phone_number': phoneNumber },
      limit: 1,
    });

    return result.items.length > 0 ? (result.items[0] as Company) : null;
  }

  async updateCompany(
    companyId: string,
    updates: {
      company_name?: string;
      service_type?: ServiceType;
      phone_number?: string;
      email?: string;
      timezone?: string;
      business_hours?: BusinessHours;
      schedule_overrides?: any;
      appointment_duration_minutes?: number;
      slot_interval_minutes?: number;
      appointment_cancellation_policy?: AppointmentCancellationPolicy;
      status?: CompanyStatus;
      subscription_tier?: string;
      trial_ends_at?: number | null;
      trial_used_at?: number | null;
      calls_enabled?: boolean;
      sms_enabled?: boolean;
      usage_service_blocked?: {
        calls?: boolean;
        sms?: boolean;
        updated_at?: number;
      };
      use_simple_scheduling?: boolean;
      // Billing fields
      stripe_customer_id?: string;
      stripe_subscription_id?: string | null;
      subscription_plan?: SubscriptionPlan | null;
      subscription_status?: SubscriptionStatus | null;
      current_period_start?: number | null;
      current_period_end?: number | null;
      payment_method_last4?: string;
      payment_method_brand?: string;
      cancel_at_period_end?: boolean;
      stripe_connect_account_id?: string;
      stripe_connect_onboarding_complete?: boolean;
      booking_payment_enabled?: boolean;
      booking_payment_mode?: 'HANDYCALL_MANAGED' | 'SELF_MANAGED';
      booking_payment_mode_confirmed?: boolean;
      booking_services?: Array<{
        service_id: string;
        name: string;
        description?: string;
        amount_cents: number;
        currency?: string;
        duration_minutes?: number;
        active?: boolean;
        collect_payment?: boolean;
        billing_type?: 'ONE_TIME' | 'SUBSCRIPTION';
        billing_interval?: 'day' | 'week' | 'month' | 'year';
        billing_interval_count?: number;
        trial_period_days?: number;
      }>;
      follow_up_sequences_enabled?: boolean;
      follow_up_initial_delay_minutes?: number;
      follow_up_second_delay_minutes?: number;
      follow_up_final_delay_minutes?: number;
      follow_up_initial_template?: string;
      follow_up_second_template?: string;
      follow_up_final_template?: string;
      review_request_enabled?: boolean;
      review_request_delay_minutes?: number;
      review_platform_url?: string;
      review_request_template?: string;
      website_widget_enabled?: boolean;
      website_widget_settings?: {
        primary_color?: string;
        position?: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
        greeting?: string;
      };
      // Calendar fields
      calendar_setup_completed?: boolean;
      schedule_setup_completed?: boolean;
      calendar_mode?: 'INTERNAL' | 'EXTERNAL';
      calendar_provider?: 'NONE' | 'GOOGLE' | 'MICROSOFT' | 'APPLE';
      calendar_connection?: any;
      service_area_zipcodes?: string[];
      service_area_cities?: string[];
      pricing_profile?: Record<string, any>;
      marketplace_profile?: Record<string, any>;
      company_profile_completed?: boolean;
      service_area_completed?: boolean;
      marketplace_profile_completed?: boolean;
      public_profile_enabled?: boolean;
      service_template_id?: string;
    }
  ): Promise<Company> {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updatedData: Record<string, any> = {
      ...updates,
      updated_at: Date.now(),
    };

    if (updates.service_type && !updates.service_template_id) {
      updatedData.service_template_id = resolveServiceTemplateId(updates.service_type);
    }

    // Auto-enable public profile when marketplace profile is marked complete
    if (updates.marketplace_profile_completed === true && updatedData.public_profile_enabled === undefined) {
      updatedData.public_profile_enabled = true;
    }

    const nextStatus = updates.status ?? company.status;
    if (nextStatus === CompanyStatus.INACTIVE || nextStatus === CompanyStatus.SUSPENDED) {
      updatedData.calls_enabled = false;
      updatedData.sms_enabled = false;
    }

    const result = await this.dynamodb.update(
      this.tableName,
      { company_id: companyId },
      updatedData
    );

    return result as Company;
  }

  /**
   * Update AWS Connect phone number details for a company
   */
  /**
   * List all companies (admin only)
   */
  async listAll(limit = 100): Promise<Company[]> {
    const result = await this.dynamodb.scan(this.tableName, { limit });
    const companies = result.items as Company[];
    return Promise.all(
      companies.map(async (company) => {
        const finalized = await this.finalizeExpiredCancellation(company);
        return this.normalizeNoPlanStatus(finalized);
      })
    );
  }

  /**
   * Delete a company and all associated data (admin only)
   * WARNING: This is a destructive operation
   */
  async deleteCompany(
    companyId: string,
    options?: {
      deletedByUserId?: string;
      deletedByEmail?: string;
      source?: 'self_serve' | 'admin';
    }
  ): Promise<void> {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.writeDeletionAudit(company, options);

    await this.s3Service.deleteCompanyArtifacts(companyId);

    await Promise.all([
      this.deleteRelatedData('users', companyId),
      this.deleteRelatedData('contacts', companyId),
      this.deleteRelatedData('appointments', companyId),
      this.deleteRelatedData('pricing_rules', companyId),
      this.deleteRelatedData('webhook_configs', companyId),
      this.deleteRelatedData('notification_preferences', companyId),
      this.deleteRelatedData('notifications', companyId),
      this.deleteRelatedData('notification_devices', companyId),
      this.deleteRelatedData('notification_usage_alerts', companyId),
      this.deleteRelatedData('usage_metrics', companyId),
      this.deleteRelatedData('customer_payments', companyId),
      this.deleteRelatedData('connected_accounts', companyId),
      this.deleteRelatedData('chat_sessions', companyId),
      this.deleteRelatedData('follow_up_sequences', companyId),
      this.deleteRelatedData('scheduled_messages', companyId),
      this.deleteRelatedData('invoices', companyId),
      this.deleteRelatedData('portal_messages', companyId),
      this.deleteRelatedData('quote_requests', companyId),
      this.deleteRelatedData('sms_templates', companyId),
      this.deleteRelatedData('sms', companyId),
      this.deleteRelatedData('team_members', companyId),
      this.deleteRelatedData('billing_events', companyId),
      this.deleteRelatedDataByAttribute('reviews', 'provider_company_id', companyId),
    ]);

    await this.dynamodb.delete(this.tableName, { company_id: companyId });
  }

  assertSelfServeDeletionAllowed(company: Company): void {
    const hasSubscriptionLink = Boolean(
      company.subscription_plan ||
      company.subscription_status ||
      company.stripe_subscription_id ||
      company.stripe_customer_id
    );

    const hasPaymentsLink = Boolean(
      company.stripe_connect_account_id ||
      company.stripe_connect_onboarding_complete ||
      company.booking_payment_enabled
    );

    if (hasSubscriptionLink || hasPaymentsLink) {
      throw new BadRequestException(
        'This account cannot be deleted while billing, Stripe, or payment setup is linked. Please contact hello@handycall.org.'
      );
    }
  }

  /**
   * Helper to delete all items for a company from a table
   */
  private async deleteRelatedData(tableName: string, companyId: string): Promise<void> {
    try {
      const result = await this.dynamodb.scan(tableName, {
        filterExpression: '#company_id = :company_id',
        expressionAttributeNames: { '#company_id': 'company_id' },
        expressionAttributeValues: { ':company_id': companyId },
      });

      for (const item of result.items) {
        const keys = this.getTableKeys(tableName, item);
        if (keys) {
          await this.dynamodb.delete(tableName, keys);
        }
      }
    } catch (error) {
      console.error(`Failed to delete related data from ${tableName}:`, error);
      // Continue with other deletions even if one fails
    }
  }

  private async deleteRelatedDataByAttribute(
    tableName: string,
    attributeName: string,
    value: string
  ): Promise<void> {
    try {
      const result = await this.dynamodb.scan(tableName, {
        filterExpression: '#attr = :value',
        expressionAttributeNames: { '#attr': attributeName },
        expressionAttributeValues: { ':value': value },
      });

      for (const item of result.items) {
        const keys = this.getTableKeys(tableName, item);
        if (keys) {
          await this.dynamodb.delete(tableName, keys);
        }
      }
    } catch (error) {
      console.error(`Failed to delete related data from ${tableName} by ${attributeName}:`, error);
    }
  }

  /**
   * Get the primary key for a table item
   */
  private getTableKeys(tableName: string, item: any): any {
    const keyMap: Record<string, string[]> = {
      users: ['company_id', 'user_id'],
      contacts: ['company_id', 'contact_id'],
      appointments: ['company_id', 'appointment_id'],
      pricing_rules: ['company_id', 'pricing_id'],
      webhook_configs: ['company_id'],
      notification_preferences: ['company_id', 'user_id'],
      notifications: ['company_id', 'notification_id'],
      notification_devices: ['company_id', 'device_id'],
      notification_usage_alerts: ['company_id', 'alert_key'],
      usage_metrics: ['company_id', 'date'],
      billing_events: ['company_id', 'event_id'],
      customer_payments: ['company_id', 'payment_id'],
      connected_accounts: ['company_id'],
      chat_sessions: ['company_id', 'session_id'],
      follow_up_sequences: ['company_id', 'sequence_id'],
      scheduled_messages: ['company_id', 'message_id'],
      invoices: ['company_id', 'invoice_id'],
      portal_messages: ['company_id', 'message_id'],
      quote_requests: ['company_id', 'quote_id'],
      reviews: ['provider_company_id', 'review_id'],
      sms_templates: ['company_id', 'template_id'],
      sms: ['company_id', 'sms_id'],
      team_members: ['company_id', 'member_id'],
    };

    const keyNames = keyMap[tableName];
    if (!keyNames) return null;

    const keys: any = {};
    for (const keyName of keyNames) {
      if (item[keyName]) {
        keys[keyName] = item[keyName];
      }
    }

    return Object.keys(keys).length > 0 ? keys : null;
  }

  private async writeDeletionAudit(
    company: Company,
    options?: {
      deletedByUserId?: string;
      deletedByEmail?: string;
      source?: 'self_serve' | 'admin';
    }
  ): Promise<void> {
    await this.dynamodb.put(this.deletionAuditTableName, {
      company_id: company.company_id,
      deleted_at: Date.now(),
      audit_id: uuidv4(),
      company_name: company.company_name,
      company_email: company.email,
      company_phone: company.phone_number || null,
      subscription_plan: company.subscription_plan || null,
      subscription_status: company.subscription_status || null,
      source: options?.source || 'self_serve',
      deleted_by_user_id: options?.deletedByUserId || null,
      deleted_by_email: options?.deletedByEmail || null,
      created_at: Date.now(),
    });
  }

  /**
   * Get company statistics (admin only)
   */
  async getCompanyStats(companyId: string): Promise<CompanyStats> {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get total users
    const usersResult = await this.dynamodb.query(
      'users',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId }
    );

    // Get total contacts
    const contactsResult = await this.dynamodb.query(
      'contacts',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId }
    );

    // Get total appointments
    const appointmentsResult = await this.dynamodb.query(
      'appointments',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId }
    );

    return {
      total_users: usersResult.items.length,
      total_contacts: contactsResult.items.length,
      total_appointments: appointmentsResult.items.length,
    };
  }

  /**
   * Search companies by name or email
   */
  async searchCompanies(searchTerm: string): Promise<Company[]> {
    const allCompanies = await this.listAll();

    const lowercaseSearch = searchTerm.toLowerCase();
    return allCompanies.filter(
      (company) =>
        company.company_name.toLowerCase().includes(lowercaseSearch) ||
        company.email.toLowerCase().includes(lowercaseSearch)
    );
  }

  private async finalizeExpiredCancellation(company: Company): Promise<Company> {
    if (
      company.stripe_subscription_id ||
      !company.cancel_at_period_end ||
      !company.current_period_end ||
      company.current_period_end > Date.now()
    ) {
      return company;
    }

    const updated = await this.dynamodb.update(
      this.tableName,
      { company_id: company.company_id },
      {
        subscription_plan: null,
        subscription_status: null,
        stripe_subscription_id: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        status: CompanyStatus.INACTIVE,
        trial_ends_at: null,
        calls_enabled: false,
        sms_enabled: false,
        updated_at: Date.now(),
      }
    );

    return updated as Company;
  }

  private async normalizeNoPlanStatus(company: Company): Promise<Company> {
    const hasPlan = Boolean(company.subscription_plan || company.stripe_subscription_id);
    const hasStatus = Boolean(company.subscription_status);
    const canceling =
      company.cancel_at_period_end &&
      company.current_period_end &&
      company.current_period_end > Date.now();

    if (!hasPlan && !hasStatus && !canceling && company.status !== CompanyStatus.INACTIVE) {
      const updated = await this.dynamodb.update(
        this.tableName,
        { company_id: company.company_id },
        {
          status: CompanyStatus.INACTIVE,
          calls_enabled: false,
          sms_enabled: false,
          updated_at: Date.now(),
        }
      );
      return updated as Company;
    }

    return company;
  }
}
