import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConnectService } from '../../infrastructure/aws/connect.service';
import { CompaniesService } from '../companies/companies.service';
import { PhoneNumberCountryCode, PhoneNumberType } from '@aws-sdk/client-connect';

@Injectable()
export class TelephonyService {
  constructor(
    private readonly connectService: ConnectService,
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * Get available phone numbers from AWS Connect
   */
  async getAvailablePhoneNumbers(
    country: string = 'US',
    type: string = 'DID',
    maxResults: number = 10,
  ) {
    const countryCode = country.toUpperCase() as PhoneNumberCountryCode;
    const phoneType = type.toUpperCase() as PhoneNumberType;

    return await this.connectService.listAvailablePhoneNumbers(
      countryCode,
      phoneType,
      maxResults,
    );
  }

  /**
   * Claim a phone number for a company
   */
  async claimPhoneNumberForCompany(
    companyId: string,
    phoneNumber: string,
    description?: string,
  ) {
    // 1. Check if company exists
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // 2. Check if company already has a phone number
    if (company.connect_phone_number_id) {
      // Verify if it's still active
      const isActive = await this.connectService.verifyPhoneNumber(
        company.connect_phone_number_id,
      );

      if (isActive) {
        throw new BadRequestException(
          `Company already has a phone number: ${company.connect_phone_number}. Release it first before claiming a new one.`,
        );
      }

      // If not active, allow re-claiming (old one was released)
      console.log(
        `Old phone number ${company.connect_phone_number} is no longer active. Allowing re-claim.`,
      );
    }

    // 3. Claim the phone number in AWS Connect
    const desc = description || `HandyCall - ${company.company_name}`;
    const claimedNumber = await this.connectService.claimPhoneNumber(phoneNumber, desc);

    // 4. Update company record with Connect phone details
    await this.companiesService.updateConnectPhoneNumber(companyId, {
      connect_phone_number_id: claimedNumber.phoneNumberId,
      connect_phone_number: claimedNumber.phoneNumber,
      connect_instance_id: this.connectService['instanceId'], // Access private field
    });

    return {
      phoneNumberId: claimedNumber.phoneNumberId,
      phoneNumber: claimedNumber.phoneNumber,
      phoneNumberArn: claimedNumber.phoneNumberArn,
      companyName: company.company_name,
    };
  }

  /**
   * Release a company's phone number
   */
  async releasePhoneNumberForCompany(companyId: string) {
    // 1. Get company
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // 2. Check if company has a phone number
    if (!company.connect_phone_number_id) {
      throw new BadRequestException('Company does not have a phone number to release');
    }

    // 3. Release the phone number in AWS Connect
    await this.connectService.releasePhoneNumber(company.connect_phone_number_id);

    // 4. Clear Connect phone details from company record
    await this.companiesService.updateConnectPhoneNumber(companyId, {
      connect_phone_number_id: undefined,
      connect_phone_number: undefined,
      connect_instance_id: undefined,
    });
  }

  /**
   * Get a company's phone number details
   */
  async getCompanyPhoneNumber(companyId: string) {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.connect_phone_number_id || !company.connect_phone_number) {
      return null;
    }

    return {
      phoneNumberId: company.connect_phone_number_id,
      phoneNumber: company.connect_phone_number,
      instanceId: company.connect_instance_id,
    };
  }

  /**
   * Verify if a company's phone number is still active in AWS Connect
   */
  async verifyCompanyPhoneNumber(companyId: string): Promise<boolean> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.connect_phone_number_id) {
      return false;
    }

    return await this.connectService.verifyPhoneNumber(company.connect_phone_number_id);
  }
}
