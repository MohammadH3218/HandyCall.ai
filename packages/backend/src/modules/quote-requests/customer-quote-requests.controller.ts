import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { AuthContext } from '@handycall/shared';
import { QuoteRequestsService } from './quote-requests.service';
import { UpdateQuoteRequestDto } from './dto/quote-request.dto';

@Public()
@Controller('customer/quote-requests')
@UseGuards(CustomerJwtAuthGuard)
export class CustomerQuoteRequestsController {
  constructor(private readonly service: QuoteRequestsService) {}

  @Get()
  async listMyRequests(@Auth() auth: AuthContext) {
    const quotes = await this.service.listForCustomerIdentity({
      email: auth.email,
      userId: auth.user_id,
    });

    return { quotes };
  }

  @Put(':quoteId')
  async updateMyRequest(
    @Auth() auth: AuthContext,
    @Param('quoteId') quoteId: string,
    @Body() dto: UpdateQuoteRequestDto,
  ) {
    const quote = await this.service.updateQuoteRequestForCustomer(
      {
        email: auth.email,
        userId: auth.user_id,
      },
      quoteId,
      dto,
    );

    return { quote };
  }
}
