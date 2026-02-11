import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { AgentConfigService } from '../agent-config/agent-config.service';
import { CognitoService } from './cognito.service';
import {
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  JWTPayload,
  UserRole,
  ServiceType,
} from '@handycall/shared';
import { isValidEmail, isValidPhoneNumber, formatPhoneNumber, isValidTimezone } from '@handycall/shared';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, createHash } from 'crypto';
import { sendSesEmail } from '../public-booking/email.util';
import { renderHandycallEmail } from '../../common/email-templates';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private agentConfigService: AgentConfigService,
    private cognitoService: CognitoService
  ) {}

  async register(
    companyName: string | undefined,
    serviceType: ServiceType | undefined,
    email: string,
    password: string,
    phoneNumber: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
    timezone: string | undefined
  ): Promise<RegisterResponse> {
    // Validate inputs
    if (!isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    const resolvedPhone = phoneNumber?.trim() || undefined;
    if (!resolvedPhone) {
      throw new BadRequestException('Phone number is required to create an account.');
    }
    if (resolvedPhone && !isValidPhoneNumber(resolvedPhone)) {
      throw new BadRequestException('Invalid phone number format (use E.164: +1234567890)');
    }

    const resolvedTimezone = timezone?.trim() || 'America/New_York';
    if (!isValidTimezone(resolvedTimezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    const normalizedName = companyName?.trim();
    const resolvedCompanyName = normalizedName && normalizedName.length > 0
      ? normalizedName
      : `HandyCall Account ${uuidv4().slice(0, 8)}`;
    const hasProvidedServiceType = Object.values(ServiceType).includes(serviceType as ServiceType);
    const resolvedServiceType = hasProvidedServiceType
      ? (serviceType as ServiceType)
      : ServiceType.OTHER;

    const derivedFirstName = firstName?.trim() || email.split('@')[0] || 'Owner';
    const derivedLastName = lastName?.trim() || 'Account';

    // Format phone number when provided
    const formattedPhone = resolvedPhone ? formatPhoneNumber(resolvedPhone) : undefined;

    const status = await this.cognitoService.getUserStatus(email);
    if (!status || status !== 'CONFIRMED') {
      throw new BadRequestException('Phone number must be verified before creating the account.');
    }

    let company = await this.companiesService.findByEmail(email);
    let createdCompany = false;

    if (!company) {
      // Create company
      const companyProfileCompleted = Boolean(normalizedName && hasProvidedServiceType);
      company = await this.companiesService.createCompany(
        resolvedCompanyName,
        resolvedServiceType,
        email,
        formattedPhone,
        resolvedTimezone,
        { companyProfileCompleted }
      );
      createdCompany = true;
    }

    // Create owner user (or attach if company already existed but user didn't)
    let user;
    try {
      const created = await this.usersService.createUser(
        company.company_id,
        undefined, // companyName - already have company_id
        email,
        password,
        derivedFirstName,
        derivedLastName,
        UserRole.OWNER,
        'users',
        undefined,
        undefined,
        undefined,
        undefined,
        formattedPhone,
        true
      );
      user = created.user;
      if (formattedPhone) {
        user = await this.usersService.markPhoneVerified(company.company_id, user.user_id, formattedPhone);
      }
    } catch (error) {
      // Roll back orphaned company if user creation failed
      if (createdCompany && company?.company_id) {
        try {
          await this.companiesService.deleteCompany(company.company_id);
        } catch (rollbackError) {
          console.error('[AuthService] Failed to rollback company after user creation error:', rollbackError);
        }
      }
      throw error;
    }

    // Create default agent config
    await this.agentConfigService.createDefaultConfig(company.company_id);

    // Generate tokens
    const tokens = this.generateTokens(user.user_id, company.company_id, email, user.role);

    return {
      user,
      company,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }



  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      // Generate new access token
      const accessToken = this.jwtService.sign(
        {
          user_id: payload.user_id,
          company_id: payload.company_id,
          email: payload.email,
          role: payload.role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') + 's',
        }
      );

      return {
        access_token: accessToken,
        expires_in: parseInt(this.configService.get<string>('JWT_EXPIRES_IN') || '3600'),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(
    userId: string,
    companyId: string,
    email: string,
    role: UserRole
  ): { access_token: string; refresh_token: string } {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      user_id: userId,
      company_id: companyId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') + 's',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') + 's',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // ========================================================================
  // HYBRID AUTHENTICATION (Cognito validation + Custom JWT)
  // ========================================================================

  async loginHybrid(email: string, password: string): Promise<LoginResponse> {
    // Validate with Cognito
    const result = await this.cognitoService.login(email, password, 'auto');

    // Check if user needs to change password
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      const poolType = result.poolType || 'users';
      const isAdmin = poolType === 'admin';

      return {
        requiresPasswordChange: true,
        session: result.session,
        email,
        userRole: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
        poolType: poolType,
      } as any;
    }

    // Get user info from Cognito attributes
    const companyId = result.userAttributes?.['custom:company_id'];
    const userId = result.userAttributes?.['sub']; // Cognito user ID
    const poolType = result.poolType || 'users';

    // Determine role
    let role: UserRole;
    if (poolType === 'admin') {
      role = UserRole.ADMIN;
    } else {
      role = UserRole.OWNER; // Default for customer users
    }

    // Try to fetch user and company from DynamoDB
    let user = null;
    let company = null;

    if (companyId) {
      try {
        company = await this.companiesService.findById(companyId);
        user = await this.usersService.findByEmail(email);
        if (user) {
          role = user.role; // Use role from database if available
        }
      } catch (error) {
        console.warn('[AuthService] Failed to fetch user/company from DynamoDB:', error);
      }
    }

    // Generate custom JWT tokens
    const tokens = this.generateTokens(
      userId || email, // Use Cognito sub as user_id
      companyId || 'no-company',
      email,
      role
    );

    // Remove password_hash from user object if present
    const userResponse = user ? { ...user, password_hash: undefined } : null;

    return {
      user: userResponse as any,
      company: company as any,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: parseInt(this.configService.get<string>('JWT_EXPIRES_IN') || '3600'),
    };
  }

  // ========================================================================
  // COGNITO-BASED AUTHENTICATION
  // ========================================================================

  private async buildLoginResponseFromCognitoResult(result: any, email: string) {
    // Get company and user info from DynamoDB using custom attributes
    const companyId = result.userAttributes?.['custom:company_id'];
    const poolType = result.poolType || 'users';

    // Determine user role based on poolType - this is the source of truth
    // Admin pool users are admins, users pool users are customers
    if (poolType === 'admin') {
      // Admin users - return admin role
      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        userRole: UserRole.ADMIN,
        isAdmin: true,
      };
    }

    // Users pool = customer user, even if company_id is not yet set
    // Try to fetch company if company_id exists
    if (companyId) {
      const company = await this.companiesService.findById(companyId);

      // Fetch user data from DynamoDB
      let user = null;
      try {
        user = await this.usersService.findByEmail(email);
      } catch (userError) {
        console.warn('[AuthService] Failed to fetch user from DynamoDB:', userError);
      }

      if (!company) {
        // Company ID exists in Cognito but not in DynamoDB - still customer but missing company
        return {
          requiresPasswordChange: false,
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          user,
          email,
          company_id: companyId,
          userRole: UserRole.OWNER,
        };
      }

      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        company,
        user,
        email,
        company_id: companyId,
        userRole: UserRole.OWNER,
      };
    }

    // Customer user from users pool but no company_id set yet
    return {
      requiresPasswordChange: false,
      access_token: result.accessToken,
      id_token: result.idToken,
      refresh_token: result.refreshToken,
      email,
      userRole: UserRole.OWNER,
    };
  }

  async loginWithCognito(email: string, password: string) {
    let result;

    try {
      result = await this.cognitoService.login(email, password, 'auto');

      // Check if user needs to change password
      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        // Determine if this is an admin user based on pool type only
        const poolType = result.poolType || 'users';
        const isAdmin = poolType === 'admin';

        return {
          requiresPasswordChange: true,
          session: result.session,
          email,
          userRole: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
          poolType: poolType, // Include pool type so we can use it for password change
        };
      }
    } catch (error: any) {
      console.error('[AuthService] loginWithCognito error:', {
        name: error.name,
        message: error.message,
        email: email,
        stack: error.stack
      });

      // Re-throw known errors
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      // For unknown errors, throw a generic error with logging
      throw new UnauthorizedException('Authentication failed. Please try again later.');
    }

    return this.buildLoginResponseFromCognitoResult(result, email);
  }

  async loginWithSmsRequirement(email: string, password: string) {
    const result: any = await this.cognitoService.login(email, password, 'auto');
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      const poolType = result.poolType || 'users';
      const isAdmin = poolType === 'admin';
      return {
        requiresPasswordChange: true,
        session: result.session,
        email,
        userRole: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
        poolType: poolType,
      };
    }

    if (result.challengeName === 'SMS_MFA') {
      throw new UnauthorizedException('SMS verification required. Please complete SMS verification to log in.');
    }

    // If no MFA challenge, return tokens directly
    return this.buildLoginResponseFromCognitoResult(result, email);
  }

  async requestLoginSms(email: string, password: string) {
    const trimmedEmail = String(email || '').trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    const result = await this.cognitoService.login(trimmedEmail, password, 'auto');
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      const poolType = result.poolType || 'users';
      const isAdmin = poolType === 'admin';
      return {
        requiresPasswordChange: true,
        session: result.session,
        email: trimmedEmail,
        userRole: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
        poolType,
      };
    }

    const poolType = result.poolType || 'users';
    if (poolType === 'admin') {
      return { skipSms: true };
    }

    if (result.challengeName === 'SMS_MFA') {
      return {
        sms_required: true,
        session: result.session,
      };
    }

    return { skipSms: true };
  }

  async verifyLoginSms(email: string, password: string, session: string, code: string) {
    const trimmedEmail = String(email || '').trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    const result = await this.cognitoService.respondToSmsMfa(trimmedEmail, session, code);
    if (!result?.accessToken || !result?.idToken) {
      throw new UnauthorizedException('SMS verification failed');
    }

    return this.buildLoginResponseFromCognitoResult(result, trimmedEmail);
  }

  async changePassword(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' = 'users',
    firstName?: string,
    lastName?: string
  ) {
    try {
      const result = await this.cognitoService.respondToNewPasswordChallenge(
        email,
        newPassword,
        session,
        poolType
      );

      // Admin users don't need company setup - return immediately
      if (poolType === 'admin') {
        if (firstName || lastName) {
          const attrs: Record<string, string> = {};
          if (firstName) attrs['given_name'] = firstName;
          if (lastName) attrs['family_name'] = lastName;
          try {
            await this.cognitoService.updateUserAttributes(email, attrs, 'admin');
          } catch (e) {
            console.warn('[AuthService] Failed to update admin attributes during password change', e);
          }
        }
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: UserRole.ADMIN,
        };
      }

      // For users pool: Get company info - handle case where user might not have company_id yet
      const companyId = result.userAttributes?.['custom:company_id'];

      // If the user somehow lacks a company assignment, require setup instead of creating placeholders
      if (!companyId) {
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: UserRole.OWNER,
          requiresCompanySetup: true, // Users need company setup if no company_id
        };
      }

      // User has company_id - fetch company from DynamoDB
      // Wrap in try-catch to handle DynamoDB permission errors gracefully
      let company = null;
      try {
        company = await this.companiesService.findById(companyId);

        // Update user attributes if provided
        const attributesToUpdate: Record<string, string> = {};

        // Always update name attributes if provided
        if (firstName) {
          attributesToUpdate['given_name'] = firstName;
        }
        if (lastName) {
          attributesToUpdate['family_name'] = lastName;
        }

        // Update Cognito attributes if any were set
        if (Object.keys(attributesToUpdate).length > 0) {
          await this.cognitoService.updateUserAttributes(
            email,
            attributesToUpdate,
            poolType
          );
        }
      } catch (dbError: any) {
        // If DynamoDB access fails (e.g., IAM permissions), log but continue
        // Password change in Cognito succeeded, so we should still return success
        console.warn('[AuthService] DynamoDB access failed during password change (password change succeeded):', dbError?.name || dbError?.message);
      }

      if (!company) {
        // Company not found in DB or DB access failed, but password change succeeded
        // Return tokens but indicate company setup needed
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: UserRole.OWNER,
          requiresCompanySetup: true,
        };
      }

      // Fetch user data from DynamoDB to include in response
      let user = null;
      try {
        user = await this.usersService.findByEmail(email);
      } catch (userError) {
        console.warn('[AuthService] Failed to fetch user from DynamoDB:', userError);
      }

      return {
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        company,
        user,
        email,
        company_id: companyId,
        userRole: UserRole.OWNER,
      };
    } catch (error: any) {
      console.error('[AuthService] Password change error:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotAuthorizedException' || error.message?.includes('Invalid session')) {
        throw new UnauthorizedException('Session expired or invalid. Please login again.');
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to change password. Please try again.');
    }
  }

  async refreshWithCognito(refreshToken: string, email: string) {
    const result = await this.cognitoService.refreshAccessToken(refreshToken, email);

    // Get user attributes to fetch company info
    const userAttributes = await this.cognitoService.getUserAttributes(email);
    const companyId = userAttributes?.['custom:company_id'];

    if (!companyId) {
      throw new UnauthorizedException('User not properly configured');
    }

    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    return {
      access_token: result.accessToken,
      id_token: result.idToken,
      company,
      email,
      company_id: companyId,
    };
  }

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('NEXTAUTH_URL') ||
      'https://handycall.org'
    ).replace(/\/$/, '');
  }

  async requestPasswordReset(email: string) {
    const trimmed = String(email || '').trim();
    if (!isValidEmail(trimmed)) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const user = await this.usersService.findByEmail(trimmed);
    if (!user) {
      // Always return ok to avoid leaking account existence.
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const ttlMinutes = Number(this.configService.get<string>('RESET_TOKEN_TTL_MINUTES') || '5');
    const expiresAt = Date.now() + ttlMinutes * 60_000;

    await this.usersService.setPasswordResetToken(trimmed, tokenHash, expiresAt);

    const resetUrl = `${this.getFrontendBaseUrl()}/reset-password?email=${encodeURIComponent(
      trimmed
    )}&token=${encodeURIComponent(token)}`;

    const fromAddress =
      this.configService.get<string>('NO_REPLY_EMAIL') ||
      this.configService.get<string>('NO_CONTACT_EMAIL') ||
      'no-reply@handycall.org';
    const region = this.configService.get<string>('SES_REGION') || this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const subject = 'Reset your HandyCall password';
    const text =
      `We received a request to reset your HandyCall password.\n\n` +
      `Use the link below to set a new password (valid for ${ttlMinutes} minutes):\n${resetUrl}\n\n` +
      `If you did not request this, you can safely ignore this email.`;
    const html = renderHandycallEmail({
      title: 'Reset your password',
      preheader: 'Reset your HandyCall password',
      greeting: 'Hi there,',
      body: `<p style="margin:0 0 16px;">We received a request to reset your HandyCall password.</p>
             <p style="margin:0 0 16px;">Use the link below to set a new password. This link expires in ${ttlMinutes} minutes.</p>`,
      cta: { label: 'Reset password', url: resetUrl },
      footer: 'If you did not request this, you can safely ignore this email.',
    });

    try {
      await sendSesEmail({
        region,
        from: `HandyCall <${fromAddress}>`,
        to: [trimmed],
        subject,
        text,
        html,
      });
    } catch (err: any) {
      // Don't leak account existence or SES sandbox state to caller.
      console.warn('[AuthService] Password reset email send failed', err?.message || err);
    }

    return { ok: true };
  }

  async confirmPasswordReset(email: string, token: string, newPassword: string) {
    const trimmedEmail = String(email || '').trim();
    const trimmedToken = String(token || '').trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new BadRequestException('Please provide a valid email address.');
    }
    if (!trimmedToken) {
      throw new BadRequestException('Reset token is required.');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const user = await this.usersService.findByEmail(trimmedEmail);
    if (!user) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    const tokenHash = createHash('sha256').update(trimmedToken).digest('hex');
    const storedHash = (user as any).reset_token_hash;
    const expiresAt = Number((user as any).reset_token_expires_at || 0);
    if (!storedHash || storedHash !== tokenHash || !expiresAt || Date.now() > expiresAt) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    await this.cognitoService.setUserPassword(trimmedEmail, newPassword, 'auto');
    await this.usersService.clearPasswordResetToken(trimmedEmail);

    return { ok: true };
  }

  async sendRegisterSms(
    email: string,
    password: string,
    phoneNumber: string,
    firstName?: string,
    lastName?: string
  ) {
    if (!isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format (use E.164: +1234567890)');
    }
    const formattedPhone = formatPhoneNumber(phoneNumber);
    return this.cognitoService.signUpUser(email, password, formattedPhone, firstName, lastName);
  }

  async verifyRegisterSms(email: string, code: string) {
    return this.cognitoService.confirmSignUp(email, code);
  }

  async updatePassword(
    companyId: string,
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    if (!companyId || !userId) {
      throw new BadRequestException('Invalid user context');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const user = await this.usersService.findById(companyId, userId);
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    await this.cognitoService.login(user.email, currentPassword, 'auto');
    await this.cognitoService.setUserPassword(user.email, newPassword, 'auto');

    return { ok: true };
  }
}
