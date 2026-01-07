import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import {
  Company,
  CompanyStatus,
  ServiceType,
  BusinessHours,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';

export interface CompanyStats {
  total_calls: number;
  total_users: number;
  ai_handled_calls: number;
  ai_handled_percentage: number;
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

  constructor(private dynamodb: DynamoDBService) {}

  async findByName(companyName: string): Promise<Company | null> {
    // Case-insensitive match via scan (tables are small enough for admin operations)
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: 'contains(#name, :name)',
      expressionAttributeNames: { '#name': 'company_name' },
      expressionAttributeValues: { ':name': companyName },
      limit: 5,
    });

    return (
      result.items.find(
        (item: any) => item.company_name?.toLowerCase() === companyName.toLowerCase()
      ) as Company | null
    ) ?? null;
  }

  async createCompany(
    companyName: string,
    serviceType: ServiceType,
    email: string,
    phoneNumber: string,
    timezone: string,
    options?: { allowExisting?: boolean }
  ): Promise<Company> {
    // Collect conflicts to report them all at once
    const conflicts: Record<string, string> = {};

    // Check if company with email already exists
    const existingByEmail = await this.findByEmail(email);
    if (existingByEmail) {
      if (options?.allowExisting) return existingByEmail;
      conflicts.email = 'Company with this email already exists';
    }

    // Check if company with phone already exists
    const existingByPhone = await this.findByPhone(phoneNumber);
    if (existingByPhone) {
      if (options?.allowExisting) return existingByPhone;
      conflicts.phone_number = 'Company with this phone number already exists';
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
      phone_number: phoneNumber,
      email,
      status: CompanyStatus.TRIAL,
      timezone,
      business_hours: defaultBusinessHours,
      created_at: timestamp,
      updated_at: timestamp,
      trial_ends_at: timestamp + 14 * 24 * 60 * 60 * 1000, // 14 days trial
      calls_enabled: true, // Enable calls by default
      sms_enabled: true, // Enable SMS by default
    };

    await this.dynamodb.put(this.tableName, company);

    return company;
  }

  async findById(companyId: string): Promise<Company | null> {
    const company = await this.dynamodb.get(this.tableName, { company_id: companyId });
    return company as Company | null;
  }

  async findByEmail(email: string): Promise<Company | null> {
    // Production email index uses company_id as the partition key; safest is a filtered scan by email.
    const result = await this.dynamodb.scan(this.tableName, {
      filterExpression: '#email = :email',
      expressionAttributeNames: { '#email': 'email' },
      expressionAttributeValues: { ':email': email },
      limit: 1,
    });

    return result.items.length > 0 ? (result.items[0] as Company) : null;
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
      phone_number?: string;
      email?: string;
      timezone?: string;
      business_hours?: BusinessHours;
      status?: CompanyStatus;
      subscription_tier?: string;
      // Billing fields
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
      subscription_plan?: SubscriptionPlan;
      subscription_status?: SubscriptionStatus;
      current_period_start?: number;
      current_period_end?: number;
      payment_method_last4?: string;
      payment_method_brand?: string;
      cancel_at_period_end?: boolean;
    }
  ): Promise<Company> {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updatedData = {
      ...updates,
      updated_at: Date.now(),
    };

    const result = await this.dynamodb.update(this.tableName, { company_id: companyId }, updatedData);

    return result as Company;
  }

  /**
   * List all companies (admin only)
   */
  async listAll(limit = 100): Promise<Company[]> {
    const result = await this.dynamodb.scan(this.tableName, { limit });
    return result.items as Company[];
  }

  /**
   * Delete a company and all associated data (admin only)
   * WARNING: This is a destructive operation
   */
  async deleteCompany(companyId: string): Promise<void> {
    const company = await this.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Delete from companies table
    await this.dynamodb.delete(this.tableName, { company_id: companyId });

    // Delete all related data
    // Note: In a production system, you'd want to do this in a transaction or use DynamoDB Streams
    await Promise.all([
      this.deleteRelatedData('users', companyId),
      this.deleteRelatedData('calls', companyId),
      this.deleteRelatedData('contacts', companyId),
      this.deleteRelatedData('appointments', companyId),
      this.deleteRelatedData('knowledge', companyId),
      this.deleteRelatedData('flagged_questions', companyId),
      this.deleteRelatedData('agent_config', companyId),
      this.deleteRelatedData('pricing_rules', companyId),
    ]);
  }

  /**
   * Helper to delete all items for a company from a table
   */
  private async deleteRelatedData(tableName: string, companyId: string): Promise<void> {
    try {
      const result = await this.dynamodb.query(
        tableName,
        '#company_id = :company_id',
        { '#company_id': 'company_id' },
        { ':company_id': companyId }
      );

      // Delete each item
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

  /**
   * Get the primary key for a table item
   */
  private getTableKeys(tableName: string, item: any): any {
    const keyMap: Record<string, string[]> = {
      users: ['company_id', 'user_id'],
      calls: ['call_id'],
      contacts: ['contact_id'],
      appointments: ['appointment_id'],
      knowledge: ['knowledge_id'],
      flagged_questions: ['flagged_id'],
      agent_config: ['config_id'],
      pricing_rules: ['pricing_id'],
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

    // Get total calls
    const callsResult = await this.dynamodb.query(
      'calls',
      '#company_id = :company_id',
      { '#company_id': 'company_id' },
      { ':company_id': companyId }
    );

    // Count AI handled calls
    const aiHandledCalls = callsResult.items.filter((call: any) => call.ai_handled === true).length;

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

    const totalCalls = callsResult.items.length;
    const aiHandledPercentage = totalCalls > 0 ? (aiHandledCalls / totalCalls) * 100 : 0;

    return {
      total_calls: totalCalls,
      total_users: usersResult.items.length,
      ai_handled_calls: aiHandledCalls,
      ai_handled_percentage: Math.round(aiHandledPercentage * 100) / 100,
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
    return allCompanies.filter(company =>
      company.company_name.toLowerCase().includes(lowercaseSearch) ||
      company.email.toLowerCase().includes(lowercaseSearch)
    );
  }
}
