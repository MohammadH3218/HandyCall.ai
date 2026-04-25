import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AuditActorType, UserType } from '@handycall/shared';
import { Request, Response } from 'express';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { ProRegisterDto } from './dto/pro-register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Public()
  @RateLimitPolicy('AUTH_REGISTER')
  @Post('customer/register')
  async registerCustomer(@Req() req: Request, @Body() dto: CustomerRegisterDto) {
    try {
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

      await this.logAuthEvent(req, {
        action: 'auth.customer_registered',
        outcome: 'SUCCESS',
        email: result.user.email,
        actorType: 'CUSTOMER',
        userType: 'CUSTOMER',
        targetId: result.user.customer_id,
      });

      return {
        message: 'Account created. Check your email to verify your account.',
        email: result.user.email,
        requires_email_verification: true,
        user_type: 'CUSTOMER' as UserType,
      };
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.customer_registration_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: dto.email,
        actorType: 'CUSTOMER',
        userType: 'CUSTOMER',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_REGISTER')
  @Post('pro/register')
  async registerPro(@Req() req: Request, @Body() dto: ProRegisterDto) {
    try {
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

      await this.logAuthEvent(req, {
        action: 'auth.pro_registered',
        outcome: 'SUCCESS',
        email: result.user.email,
        actorType: 'PRO',
        userType: 'PRO',
        targetId: result.user.pro_id,
      });

      return {
        message: 'Account created. Check your email to verify your account.',
        email: result.user.email,
        requires_email_verification: true,
        user_type: 'PRO' as UserType,
      };
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.pro_registration_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: dto.email,
        actorType: 'PRO',
        userType: 'PRO',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_LOGIN')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    try {
      const result = await this.authService.login(dto);
      const resultUser = (result as any)?.user;

      await this.logAuthEvent(req, {
        action: 'auth.login_succeeded',
        outcome: 'SUCCESS',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
        targetId: resultUser?.customer_id || resultUser?.pro_id || resultUser?.id,
      });

      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.login_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_LOGIN')
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeOAuth(@Req() req: Request, @Body() dto: OAuthExchangeDto) {
    try {
      const result = await this.authService.exchangeOAuth(dto);
      const resultUser = (result as any)?.user;

      await this.logAuthEvent(req, {
        action: 'auth.oauth_exchange_succeeded',
        outcome: 'SUCCESS',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
        targetId: resultUser?.customer_id || resultUser?.pro_id || resultUser?.id,
        metadata: { provider: dto.provider },
      });

      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.oauth_exchange_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
        metadata: { provider: dto.provider, error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_VERIFY')
  @Get('verify-email')
  async verifyEmail(@Req() req: Request, @Query('token') token: string, @Res() res: Response) {
    try {
      const result = await this.authService.verifyEmail(token);
      await this.logAuthEvent(req, {
        action: 'auth.email_verified',
        outcome: 'SUCCESS',
        actorType: 'ANONYMOUS',
        metadata: { token_present: Boolean(token) },
      });
      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.email_verification_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        actorType: 'ANONYMOUS',
        metadata: { token_present: Boolean(token), error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_VERIFY')
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  async resendConfirmation(
    @Req() req: Request,
    @Body() body: { email: string; pool_type?: 'customer' | 'users' | 'admin' },
  ) {
    const userType: UserType = body.pool_type === 'customer' ? 'CUSTOMER' : 'PRO';

    try {
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
          await this.emailService.sendProVerification(body.email, result.token, result.first_name);
        }
      }

      await this.logAuthEvent(req, {
        action: 'auth.verification_resent',
        outcome: 'SUCCESS',
        email: body.email,
        actorType: this.toActorType(userType),
        userType,
      });

      return { message: result.message };
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.verification_resend_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: body.email,
        actorType: this.toActorType(userType),
        userType,
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_REFRESH')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Body() dto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshToken(dto.refresh_token);
      await this.logAuthEvent(req, {
        action: 'auth.token_refreshed',
        outcome: 'SUCCESS',
        actorType: 'ANONYMOUS',
      });
      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.token_refresh_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        actorType: 'ANONYMOUS',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_RECOVERY')
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Req() req: Request, @Body() dto: ForgotPasswordDto) {
    try {
      const result = await this.authService.forgotPassword(dto.email, dto.user_type);
      await this.logAuthEvent(req, {
        action: 'auth.password_reset_requested',
        outcome: 'SUCCESS',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
      });
      return { message: result.message };
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.password_reset_request_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: dto.email,
        actorType: this.toActorType(dto.user_type),
        userType: dto.user_type,
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_RECOVERY')
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Req() req: Request, @Body() dto: ResetPasswordDto) {
    try {
      const result = await this.authService.resetPassword(dto.token, dto.new_password);
      await this.logAuthEvent(req, {
        action: 'auth.password_reset_completed',
        outcome: 'SUCCESS',
        actorType: 'ANONYMOUS',
      });
      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.password_reset_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        actorType: 'ANONYMOUS',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_LOGIN')
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Req() req: Request, @Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    try {
      const result = await this.authService.adminLogin(body.email, body.password);
      await this.logAuthEvent(req, {
        action: 'auth.admin_login_succeeded',
        outcome: 'SUCCESS',
        email: body.email,
        actorType: 'ADMIN',
        userType: 'ADMIN',
      });
      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.admin_login_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: body.email,
        actorType: 'ADMIN',
        userType: 'ADMIN',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  @Public()
  @RateLimitPolicy('AUTH_RECOVERY')
  @Post('admin/change-password')
  @HttpCode(HttpStatus.OK)
  async adminChangePassword(
    @Req() req: Request,
    @Body() body: { session: string; email: string; new_password: string; display_name: string },
  ) {
    if (!body.session || !body.email || !body.new_password || !body.display_name) {
      throw new BadRequestException('session, email, new_password, and display_name are required');
    }

    try {
      const result = await this.authService.adminCompleteNewPassword(
        body.session,
        body.email,
        body.new_password,
        body.display_name,
      );
      await this.logAuthEvent(req, {
        action: 'auth.admin_password_change_completed',
        outcome: 'SUCCESS',
        email: body.email,
        actorType: 'ADMIN',
        userType: 'ADMIN',
      });
      return result;
    } catch (error: any) {
      await this.logAuthEvent(req, {
        action: 'auth.admin_password_change_failed',
        outcome: 'FAILURE',
        severity: 'WARN',
        email: body.email,
        actorType: 'ADMIN',
        userType: 'ADMIN',
        metadata: { error: this.getErrorMessage(error) },
      });
      throw error;
    }
  }

  private async logAuthEvent(
    req: Request,
    params: {
      action: string;
      outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
      severity?: 'INFO' | 'WARN' | 'ERROR';
      email?: string;
      actorType?: AuditActorType;
      userType?: UserType | 'ADMIN';
      targetId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.auditLogs.logFromRequest(req, {
      category: 'AUTH',
      severity: params.severity || 'INFO',
      outcome: params.outcome,
      action: params.action,
      actor_email: params.email?.trim().toLowerCase(),
      actor_type: params.actorType || 'ANONYMOUS',
      actor_user_type: params.userType,
      target_type: 'auth',
      target_id: params.targetId,
      metadata: params.metadata,
    });
  }

  private toActorType(userType?: UserType | 'ADMIN'): AuditActorType {
    if (userType === 'ADMIN') return 'ADMIN';
    if (userType === 'PRO') return 'PRO';
    if (userType === 'CUSTOMER') return 'CUSTOMER';
    return 'ANONYMOUS';
  }

  private getErrorMessage(error: any) {
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    return 'Unknown auth error';
  }
}
