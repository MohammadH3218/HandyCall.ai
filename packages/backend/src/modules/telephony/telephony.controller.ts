import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { ClaimPhoneNumberDto } from './dto/claim-phone-number.dto';
import { GetAvailableNumbersDto } from './dto/get-available-numbers.dto';

@Controller('telephony')
@UseGuards(JwtAuthGuard)
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  /**
   * GET /telephony/available-numbers
   * Get list of available phone numbers to claim
   */
  @Get('available-numbers')
  async getAvailableNumbers(@Query() query: GetAvailableNumbersDto) {
    try {
      const numbers = await this.telephonyService.getAvailablePhoneNumbers(
        query.country || 'US',
        query.type || 'DID',
        query.maxResults || 10,
      );

      return {
        success: true,
        data: numbers,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch available phone numbers',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /telephony/claim-number
   * Claim a phone number for the company
   */
  @Post('claim-number')
  async claimNumber(
    @Body() dto: ClaimPhoneNumberDto,
    @CompanyId() companyId: string,
  ) {
    try {
      const result = await this.telephonyService.claimPhoneNumberForCompany(
        companyId,
        dto.phoneNumber,
        dto.description,
      );

      return {
        success: true,
        message: 'Phone number successfully claimed',
        data: result,
      };
    } catch (error) {
      if (error.message.includes('already has a phone number')) {
        throw new BadRequestException({
          success: false,
          message: error.message,
        });
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to claim phone number',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /telephony/release-number
   * Release the company's claimed phone number
   */
  @Delete('release-number')
  async releaseNumber(@CompanyId() companyId: string) {
    try {
      await this.telephonyService.releasePhoneNumberForCompany(companyId);

      return {
        success: true,
        message: 'Phone number successfully released',
      };
    } catch (error) {
      if (error.message.includes('does not have a phone number')) {
        throw new BadRequestException({
          success: false,
          message: error.message,
        });
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to release phone number',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /telephony/my-number
   * Get the company's current phone number
   */
  @Get('my-number')
  async getMyNumber(@CompanyId() companyId: string) {
    try {
      const phoneNumber = await this.telephonyService.getCompanyPhoneNumber(companyId);

      if (!phoneNumber) {
        return {
          success: true,
          data: null,
          message: 'No phone number claimed',
        };
      }

      return {
        success: true,
        data: phoneNumber,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch phone number',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /telephony/verify-number
   * Verify if the company's phone number is still active in AWS Connect
   */
  @Post('verify-number')
  async verifyNumber(@CompanyId() companyId: string) {
    try {
      const isValid = await this.telephonyService.verifyCompanyPhoneNumber(companyId);

      return {
        success: true,
        data: {
          isValid,
          message: isValid
            ? 'Phone number is active'
            : 'Phone number is no longer active in AWS Connect',
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to verify phone number',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
