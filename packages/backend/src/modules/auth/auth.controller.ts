import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ConfirmForgotPasswordDto } from './dto/confirm-forgot-password.dto';
import { SendSmsCodeDto } from './dto/send-sms.dto';
import { VerifySmsCodeDto } from './dto/verify-sms.dto';
import { LoginSmsDto } from './dto/login-sms.dto';
import { LoginVerifySmsDto } from './dto/login-verify-sms.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RegisterResponse } from '@handycall/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyId, UserId } from '../../common/decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(
      dto.company_name,
      dto.service_type,
      dto.email,
      dto.password,
      dto.phone_number,
      dto.first_name,
      dto.last_name,
      dto.timezone
    );
  }

  @Public()
  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendRegisterSms(
      dto.email,
      dto.password,
      dto.phone_number,
      dto.first_name,
      dto.last_name
    );
  }

  @Public()
  @Post('sms/verify')
  @HttpCode(HttpStatus.OK)
  async verifySms(@Body() dto: VerifySmsCodeDto) {
    return this.authService.verifyRegisterSms(dto.email, dto.code);
  }

  @Public()
  @Post('login/sms')
  @HttpCode(HttpStatus.OK)
  async loginSms(@Body() dto: LoginSmsDto) {
    return this.authService.requestLoginSms(dto.email, dto.password);
  }

  @Public()
  @Post('login/verify-sms')
  @HttpCode(HttpStatus.OK)
  async loginVerifySms(@Body() dto: LoginVerifySmsDto) {
    return this.authService.verifyLoginSms(dto.email, dto.password, dto.session, dto.code);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithSmsRequirement(dto.email, dto.password);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      dto.email,
      dto.new_password,
      dto.session,
      dto.pool_type || 'users',
      dto.first_name,
      dto.last_name
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('confirm-forgot-password')
  @HttpCode(HttpStatus.OK)
  async confirmForgotPassword(@Body() dto: ConfirmForgotPasswordDto) {
    return this.authService.confirmPasswordReset(dto.email, dto.token, dto.new_password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @CompanyId() companyId: string,
    @UserId() userId: string,
    @Body() dto: UpdatePasswordDto
  ) {
    return this.authService.updatePassword(companyId, userId, dto.current_password, dto.new_password);
  }
}
