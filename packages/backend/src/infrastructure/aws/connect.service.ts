import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectClient,
  SearchAvailablePhoneNumbersCommand,
  ClaimPhoneNumberCommand,
  ReleasePhoneNumberCommand,
  UpdatePhoneNumberCommand,
  DescribePhoneNumberCommand,
  AssociatePhoneNumberContactFlowCommand,
  PhoneNumberType,
  PhoneNumberCountryCode,
} from '@aws-sdk/client-connect';

export interface AvailablePhoneNumber {
  phoneNumber: string;
  phoneNumberType: string;
  phoneNumberCountryCode: string;
}

export interface ClaimedPhoneNumber {
  phoneNumberId: string;
  phoneNumber: string;
  phoneNumberArn: string;
}

@Injectable()
export class ConnectService {
  private connectClient: ConnectClient;
  private instanceId: string;
  private contactFlowId: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    this.connectClient = new ConnectClient({ region });

    // Get Connect instance ID from environment
    // You can also store this in company record if each company has their own instance
    this.instanceId = this.configService.get<string>('AWS_CONNECT_INSTANCE_ID') || 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';

    // Default contact flow ID for "HandyCall Conversational AI"
    this.contactFlowId = this.configService.get<string>('AWS_CONNECT_CONTACT_FLOW_ID') || 'e65be6c8-63b3-48f3-8e04-0377384df3dd';
  }

  /**
   * Search for available phone numbers to claim
   */
  async listAvailablePhoneNumbers(
    countryCode: PhoneNumberCountryCode = PhoneNumberCountryCode.US,
    phoneNumberType: PhoneNumberType = PhoneNumberType.DID,
    maxResults: number = 10,
  ): Promise<AvailablePhoneNumber[]> {
    try {
      const targetArn = `arn:aws:connect:${this.configService.get('AWS_REGION')}:${this.configService.get('AWS_ACCOUNT_ID')}:instance/${this.instanceId}`;

      const command = new SearchAvailablePhoneNumbersCommand({
        TargetArn: targetArn,
        PhoneNumberCountryCode: countryCode,
        PhoneNumberType: phoneNumberType,
        MaxResults: maxResults,
      });

      const response = await this.connectClient.send(command);

      if (!response.AvailableNumbersList) {
        return [];
      }

      return response.AvailableNumbersList.map((num) => ({
        phoneNumber: num.PhoneNumber || '',
        phoneNumberType: num.PhoneNumberType || phoneNumberType,
        phoneNumberCountryCode: num.PhoneNumberCountryCode || countryCode,
      }));
    } catch (error) {
      console.error('Error listing available phone numbers:', error);
      throw new Error(`Failed to list available phone numbers: ${error.message}`);
    }
  }

  /**
   * Claim a phone number for the company
   */
  async claimPhoneNumber(
    phoneNumber: string,
    description: string,
  ): Promise<ClaimedPhoneNumber> {
    try {
      const targetArn = `arn:aws:connect:${this.configService.get('AWS_REGION')}:${this.configService.get('AWS_ACCOUNT_ID')}:instance/${this.instanceId}`;

      const command = new ClaimPhoneNumberCommand({
        PhoneNumber: phoneNumber,
        TargetArn: targetArn,
        PhoneNumberDescription: description,
        Tags: {
          ManagedBy: 'HandyCall',
          ClaimedAt: new Date().toISOString(),
        },
      });

      const response = await this.connectClient.send(command);

      if (!response.PhoneNumberId || !response.PhoneNumber || !response.PhoneNumberArn) {
        throw new Error('Invalid response from ClaimPhoneNumber');
      }

      // Associate with contact flow
      await this.associatePhoneWithFlow(response.PhoneNumberId, this.contactFlowId);

      return {
        phoneNumberId: response.PhoneNumberId,
        phoneNumber: response.PhoneNumber,
        phoneNumberArn: response.PhoneNumberArn,
      };
    } catch (error) {
      console.error('Error claiming phone number:', error);
      throw new Error(`Failed to claim phone number: ${error.message}`);
    }
  }

  /**
   * Release a phone number
   */
  async releasePhoneNumber(phoneNumberId: string): Promise<void> {
    try {
      const command = new ReleasePhoneNumberCommand({
        PhoneNumberId: phoneNumberId,
      });

      await this.connectClient.send(command);
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw new Error(`Failed to release phone number: ${error.message}`);
    }
  }

  /**
   * Associate phone number with a contact flow
   */
  async associatePhoneWithFlow(
    phoneNumberId: string,
    contactFlowId: string,
  ): Promise<void> {
    try {
      const command = new AssociatePhoneNumberContactFlowCommand({
        PhoneNumberId: phoneNumberId,
        InstanceId: this.instanceId,
        ContactFlowId: contactFlowId,
      });

      await this.connectClient.send(command);
    } catch (error) {
      console.error('Error associating phone with contact flow:', error);
      throw new Error(`Failed to associate phone with contact flow: ${error.message}`);
    }
  }

  /**
   * Update phone number description
   */
  async updatePhoneNumberDescription(
    phoneNumberId: string,
    description: string,
  ): Promise<void> {
    try {
      const command = new UpdatePhoneNumberCommand({
        PhoneNumberId: phoneNumberId,
        PhoneNumberDescription: description,
      });

      await this.connectClient.send(command);
    } catch (error) {
      console.error('Error updating phone number description:', error);
      throw new Error(`Failed to update phone number description: ${error.message}`);
    }
  }

  /**
   * Get phone number details
   */
  async getPhoneNumberDetails(phoneNumberId: string): Promise<any> {
    try {
      const command = new DescribePhoneNumberCommand({
        PhoneNumberId: phoneNumberId,
      });

      const response = await this.connectClient.send(command);
      return response.ClaimedPhoneNumberSummary;
    } catch (error) {
      console.error('Error getting phone number details:', error);
      throw new Error(`Failed to get phone number details: ${error.message}`);
    }
  }

  /**
   * Verify if a phone number is still claimed and active
   */
  async verifyPhoneNumber(phoneNumberId: string): Promise<boolean> {
    try {
      const details = await this.getPhoneNumberDetails(phoneNumberId);
      return details?.PhoneNumberStatus === 'CLAIMED';
    } catch (error) {
      // If phone number doesn't exist or error, return false
      return false;
    }
  }
}
