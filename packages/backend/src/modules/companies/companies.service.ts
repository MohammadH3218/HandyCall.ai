import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { Company, CompanyStatus, ServiceType, BusinessHours } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompaniesService {
  private readonly tableName = 'companies';

  constructor(private dynamodb: DynamoDBService) {}

  async createCompany(
    companyName: string,
    serviceType: ServiceType,
    email: string,
    phoneNumber: string,
    timezone: string
  ): Promise<Company> {
    // Check if company with email already exists
    const existingByEmail = await this.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Company with this email already exists');
    }

    // Check if company with phone already exists
    const existingByPhone = await this.findByPhone(phoneNumber);
    if (existingByPhone) {
      throw new ConflictException('Company with this phone number already exists');
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
    };

    await this.dynamodb.put(this.tableName, company);

    return company;
  }

  async findById(companyId: string): Promise<Company | null> {
    const company = await this.dynamodb.get(this.tableName, { company_id: companyId });
    return company as Company | null;
  }

  async findByEmail(email: string): Promise<Company | null> {
    const result = await this.dynamodb.query(
      this.tableName,
      '#email = :email',
      { '#email': 'email' },
      { ':email': email },
      { indexName: 'email-index', limit: 1 }
    );

    return result.items.length > 0 ? (result.items[0] as Company) : null;
  }

  async findByPhone(phoneNumber: string): Promise<Company | null> {
    const result = await this.dynamodb.query(
      this.tableName,
      '#phone_number = :phone_number',
      { '#phone_number': 'phone_number' },
      { ':phone_number': phoneNumber },
      { indexName: 'phone-index', limit: 1 }
    );

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
}
