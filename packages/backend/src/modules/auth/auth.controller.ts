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
import { Public } from '../../common/decorators/public.decorator';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Simplified registration used by the existing signup page (email + password only).
 *  Saudi-specific fields (ID, district, etc.) are collected in the onboarding flow. */
class SimpleRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsBoolean()
  agreed?: boolean;

  @IsOptional()
  @IsString()
  user_type?: 'CUSTOMER' | 'PRO';
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Simplified registration endpoint compatible with the existing frontend signup page.
   * Accepts just email + password; Saudi-specific KYC fields collected during onboarding.
   */
  @Public()
  @Post('register')
  async register(@Body() dto: SimpleRegisterDto) {
    const userType = dto.user_type ?? 'CUSTOMER';
    const firstName = dto.email.split('@')[0];
    const now = Date.now();

    if (userType === 'PRO') {
      const proDto: ProRegisterDto = {
        email: dto.email,
        password: dto.password,
        first_name: firstName,
        last_name: '',
        phone_number: '+966500000000',
        id_type: 'NATIONAL_ID',
        national_id: undefined,
        iqama_number: undefined,
        pdpl_consent: true,
        pdpl_consent_at: now,
        marketing_consent: false,
      } as any;
      return this.authService.registerPro(proDto);
    }

    const customerDto: CustomerRegisterDto = {
      email: dto.email,
      password: dto.password,
      first_name: firstName,
      last_name: '',
      phone_number: '+966500000000',
      id_type: 'NATIONAL_ID',
      national_id: undefined,
      iqama_number: undefined,
      district: 'Al Olaya',
      preferred_language: 'en',
      pdpl_consent: true,
      pdpl_consent_at: now,
      marketing_consent: false,
    } as any;
    return this.authService.registerCustomer(customerDto);
  }

  @Public()
  @Post('customer/register')
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @Public()
  @Post('pro/register')
  async registerPro(@Body() dto: ProRegisterDto) {
    return this.authService.registerPro(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyEmail(token);
    // In production, redirect to frontend success page
    return res.status(HttpStatus.OK).json(result);
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
