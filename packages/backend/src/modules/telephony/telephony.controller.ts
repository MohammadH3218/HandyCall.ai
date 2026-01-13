import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId } from '../../common/decorators/auth.decorator';

@Controller('telephony')
@UseGuards(JwtAuthGuard)
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

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
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch phone number',
          error: error?.message ?? String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /telephony/inbound-numbers
   * List all inbound DIDs routed to this company (Connect/Twilio/etc.)
   */
  @Get('inbound-numbers')
  async listInboundNumbers(@CompanyId() companyId: string) {
    const numbers = await this.telephonyService.listInboundNumbers(companyId);
    return { success: true, data: numbers };
  }
}
