import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { ProRegisterDto } from './dto/pro-register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { Public } from '../../common/decorators/public.decorator';
import { EmailService } from '../email/email.service';
import { UserType } from '@handycall/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  @Public()
  @Post('customer/register')
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    const result = await this.authService.registerCustomer(dto);
    const token = await this.authService.getVerificationToken(
      result.user.customer_id,
      'CUSTOMER',
      result.user.email,
    );
    await this.emailService.sendCustomerVerification(
      result.user.email,
      token,
      result.user.first_name || 'Customer',
      'en',
    );
    return {
      message: 'Account created. Check your email to verify your account.',
      email: result.user.email,
      requires_email_verification: true,
      user_type: 'CUSTOMER' as UserType,
    };
  }

  @Public()
  @Post('pro/register')
  async registerPro(@Body() dto: ProRegisterDto) {
    const result = await this.authService.registerPro(dto);
    const token = await this.authService.getVerificationToken(
      result.user.pro_id,
      'PRO',
      result.user.email,
    );
    await this.emailService.sendProVerification(
      result.user.email,
      token,
      result.user.first_name || 'Pro',
    );
    return {
      message: 'Account created. Check your email to verify your account.',
      email: result.user.email,
      requires_email_verification: true,
      user_type: 'PRO' as UserType,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeOAuth(@Body() dto: OAuthExchangeDto) {
    return this.authService.exchangeOAuth(dto);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyEmail(token);
    // In production, redirect to frontend success page
    return res.status(HttpStatus.OK).json(result);
  }

  @Public()
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  async resendConfirmation(
    @Body() body: { email: string; pool_type?: 'customer' | 'users' | 'admin' },
  ) {
    const userType: UserType = body.pool_type === 'customer' ? 'CUSTOMER' : 'PRO';
    const result = await this.authService.resendVerification(body.email, userType);

    if (result.token && result.first_name) {
      if (userType === 'CUSTOMER') {
        await this.emailService.sendCustomerVerification(
          body.email,
          result.token,
          result.first_name,
          'en',
        );
      } else {
        await this.emailService.sendProVerification(
          body.email,
          result.token,
          result.first_name,
        );
      }
    }

    return { message: result.message };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // Returns { message } — token sending is handled internally
    const result = await this.authService.forgotPassword(dto.email, dto.user_type);
    // Return only the safe public message — strip token from response
    return { message: result.message };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }
}
