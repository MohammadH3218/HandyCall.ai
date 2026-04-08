import { Injectable, UnauthorizedException, BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { CognitoService } from './cognito.service';
import { SmsService } from './sms.service';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CustomerProfilesService } from '../customer-profiles/customer-profiles.service';
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

const PHONE_VERIFY_TABLE = 'phone_verification_codes';
const PHONE_CODE_TTL_SECONDS = 10 * 60; // 10 minutes

const LOGIN_OTP_TABLE = 'login_otp_sessions';
const LOGIN_OTP_TTL_SECONDS = 5 * 60; // 5 minutes

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private cognitoService: CognitoService,
    private smsService: SmsService,
    private dynamodbService: DynamoDBService,
    private customerProfilesService: CustomerProfilesService,
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

    // Ensure user doesn't already exist
    const existingUser = await this.usersService.findByEmail(email);
    const cognitoUserExists = await this.cognitoService.userExists(email, 'users').catch(() => false);
    if (existingUser || cognitoUserExists) {
      throw new ConflictException({
        message: 'User with this email already exists',
        fields: { email: 'User with this email already exists' },
      });
    }

    // Sign up user in Cognito (email verification required)
    try {
      const name = `${derivedFirstName} ${derivedLastName}`.trim();
      const attributes: Record<string, string> = {
        name,
        given_name: derivedFirstName,
        family_name: derivedLastName,
        'custom:company_id': company.company_id,
        'custom:company_name': company.company_name,
        ...(formattedPhone ? { phone_number: formattedPhone } : {}),
      };
      await this.cognitoService.signUpUser(email, password, attributes);
    } catch (error) {
      // Roll back orphaned company if Cognito signup failed
      if (createdCompany && company?.company_id) {
        try {
          await this.companiesService.deleteCompany(company.company_id);
        } catch (rollbackError) {
          console.error('[AuthService] Failed to rollback company after Cognito signup error:', rollbackError);
        }
      }
      throw error;
    }

    // Create owner user record in DynamoDB (skip Cognito create)
    try {
      await this.usersService.createUser(
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
        { skipCognitoCreate: true, skipCognitoCheck: true }
      );
    } catch (error) {
      // Roll back Cognito user + company if DB user creation failed
      try {
        await this.cognitoService.deleteUser(email, 'users');
      } catch (rollbackError) {
        console.error('[AuthService] Failed to rollback Cognito user after DB error:', rollbackError);
      }
      if (createdCompany && company?.company_id) {
        try {
          await this.companiesService.deleteCompany(company.company_id);
        } catch (rollbackError) {
          console.error('[AuthService] Failed to rollback company after user creation error:', rollbackError);
        }
      }
      throw error;
    }

    return {
      ok: true,
      email,
      requires_email_verification: true,
    };
  }

  async registerCustomer(
    email: string,
    password: string,
    phoneNumber?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<RegisterResponse> {
    if (!isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    const resolvedPhone = phoneNumber?.trim() || undefined;
    if (resolvedPhone && !isValidPhoneNumber(resolvedPhone)) {
      throw new BadRequestException('Invalid phone number format (use E.164: +1234567890)');
    }

    const cognitoUserExists = await this.cognitoService.userExists(email, 'customer').catch(() => false);
    if (cognitoUserExists) {
      throw new ConflictException({
        message: 'User with this email already exists',
        fields: { email: 'User with this email already exists' },
      });
    }

    const derivedFirstName = firstName?.trim() || email.split('@')[0] || 'Customer';
    const derivedLastName = lastName?.trim() || 'User';
    const attributes: Record<string, string> = {
      name: `${derivedFirstName} ${derivedLastName}`.trim(),
      given_name: derivedFirstName,
      family_name: derivedLastName,
      ...(resolvedPhone ? { phone_number: formatPhoneNumber(resolvedPhone) } : {}),
    };

    await this.cognitoService.signUpUser(email, password, attributes, 'customer');

    return {
      ok: true,
      email,
      requires_email_verification: true,
    };
  }

  async confirmSignUp(email: string, code: string, poolType: 'users' | 'customer' = 'users') {
    const trimmedEmail = String(email || '').trim();
    const trimmedCode = String(code || '').trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new BadRequestException('Invalid email format');
    }
    if (!trimmedCode) {
      throw new BadRequestException('Verification code is required');
    }

    await this.cognitoService.confirmSignUpForPool(trimmedEmail, trimmedCode, poolType);
    return { ok: true };
  }

  async resendSignUpCode(email: string, poolType: 'users' | 'customer' = 'users') {
    const trimmedEmail = String(email || '').trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    await this.cognitoService.resendConfirmationCodeForPool(trimmedEmail, poolType);
    return { ok: true };
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
        user =
          (await this.usersService.findByEmailForCompany(email, companyId)) ||
          (await this.usersService.findByEmail(email));
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

  async loginWithCognito(
    email: string,
    password: string,
    poolType: 'auto' | 'users' | 'admin' | 'customer' = 'auto',
  ) {
    let result;

    try {
      result = await this.cognitoService.login(email, password, poolType);

      // Check if user needs to change password
      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        // Determine if this is an admin user based on pool type only
        const resolvedPoolType = result.poolType || 'users';
        const isAdmin = resolvedPoolType === 'admin';

        return {
          requiresPasswordChange: true,
          session: result.session,
          email,
          userRole: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
          poolType: resolvedPoolType, // Include pool type so we can use it for password change
        };
      }
    } catch (error: any) {
      console.error('[AuthService] loginWithCognito error:', {
        name: error.name,
        message: error.message,
        email: email,
        stack: error.stack
      });

      // Re-throw all NestJS HTTP exceptions (UnauthorizedException, BadRequestException, etc.)
      if (error instanceof HttpException) {
        throw error;
      }

      // For truly unknown errors, throw a generic message (cognito.service already handles known AWS errors)
      throw new UnauthorizedException('Authentication failed. Please try again later.');
    }

    // Get company and user info from DynamoDB using custom attributes
    const companyId = result.userAttributes?.['custom:company_id'];
    const resolvedPoolType = result.poolType || 'users';

    // Determine user role based on poolType - this is the source of truth
    // Admin pool users are admins.
    if (resolvedPoolType === 'admin') {
      // Admin users - return admin role
      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        userRole: UserRole.ADMIN,
        isAdmin: true,
        poolType: 'admin',
      };
    }

    // Dedicated customer pool users are customer-side accounts.
    if (resolvedPoolType === 'customer') {
      const customerId =
        result.userAttributes?.['sub'] ||
        result.userAttributes?.['cognito:username'] ||
        email;

      await this.customerProfilesService.getOrCreate(customerId, {
        email,
        name:
          result.userAttributes?.['name'] ||
          [result.userAttributes?.['given_name'], result.userAttributes?.['family_name']]
            .filter(Boolean)
            .join(' ') ||
          undefined,
        phone: result.userAttributes?.['phone_number'],
      });

      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        userRole: UserRole.OWNER,
        poolType: 'customer',
      };
    }

    // Users pool = pro/business user.
    // Try to fetch company if company_id exists
    if (companyId) {
      const company = await this.companiesService.findById(companyId);

      // Fetch user data from DynamoDB
      let user = null;
      try {
        user =
          (await this.usersService.findByEmailForCompany(email, companyId)) ||
          (await this.usersService.findByEmail(email));
      } catch (userError) {
        console.warn('[AuthService] Failed to fetch user from DynamoDB:', userError);
      }

      if (!company) {
        // Company ID exists in Cognito but not in DynamoDB - still users-pool account
        return {
          requiresPasswordChange: false,
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          user,
          email,
          company_id: companyId,
          userRole: UserRole.OWNER,
          poolType: 'users',
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
        poolType: 'users',
      };
    }

    // Users-pool account without company yet.
    return {
      requiresPasswordChange: false,
      access_token: result.accessToken,
      id_token: result.idToken,
      refresh_token: result.refreshToken,
      email,
      userRole: UserRole.OWNER,
      poolType: 'users',
    };
  }

  async changePassword(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' | 'customer' = 'users',
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
          poolType: 'admin',
        };
      }

      if (poolType === 'customer') {
        const customerId =
          result.userAttributes?.['sub'] ||
          result.userAttributes?.['cognito:username'] ||
          email;
        await this.customerProfilesService.getOrCreate(customerId, {
          email,
          name:
            result.userAttributes?.['name'] ||
            [firstName, lastName].filter(Boolean).join(' ') ||
            undefined,
          phone: result.userAttributes?.['phone_number'],
        });
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: UserRole.OWNER,
          poolType: 'customer',
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
          poolType: 'users',
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
          poolType: 'users',
        };
      }

      // Fetch user data from DynamoDB to include in response
      let user = null;
      try {
        user =
          (await this.usersService.findByEmailForCompany(email, companyId)) ||
          (await this.usersService.findByEmail(email));
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
        poolType: 'users',
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

  async refreshWithCognito(
    refreshToken: string,
    email: string,
    poolType: 'auto' | 'users' | 'admin' | 'customer' = 'auto',
  ) {
    const result = await this.cognitoService.refreshAccessToken(refreshToken, email, poolType);
    const tokenClaims = this.decodeJwtClaims(result.idToken);
    const normalizedEmail = (tokenClaims?.email as string | undefined) || email;

    if (result.poolType === 'admin') {
      return {
        access_token: result.accessToken,
        id_token: result.idToken,
        email: normalizedEmail,
        userRole: UserRole.ADMIN,
        isAdmin: true,
        poolType: 'admin',
      };
    }

    if (result.poolType === 'customer') {
      const userAttributes: Record<string, string> = await this.cognitoService
        .getUserAttributes(normalizedEmail, 'customer')
        .catch(() => ({} as Record<string, string>));
      const customerId =
        userAttributes?.['sub'] ||
        userAttributes?.['cognito:username'] ||
        ((tokenClaims?.sub as string | undefined) ?? normalizedEmail);

      await this.customerProfilesService.getOrCreate(customerId, {
        email: normalizedEmail,
        name:
          (userAttributes?.['name'] as string | undefined) ||
          [
            userAttributes?.['given_name'] as string | undefined,
            userAttributes?.['family_name'] as string | undefined,
          ]
            .filter(Boolean)
            .join(' ') ||
          undefined,
        phone: userAttributes?.['phone_number'] as string | undefined,
      });

      return {
        access_token: result.accessToken,
        id_token: result.idToken,
        email: normalizedEmail,
        userRole: UserRole.OWNER,
        poolType: 'customer',
      };
    }

    // Users pool refresh: attach company context for customer users.
    let userAttributes: Record<string, string> = {};
    try {
      userAttributes = await this.cognitoService.getUserAttributes(normalizedEmail, 'users');
    } catch {
      userAttributes = {};
    }
    const companyId =
      userAttributes?.['custom:company_id'] ||
      ((tokenClaims?.['custom:company_id'] as string | undefined) ?? undefined);

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
      email: normalizedEmail,
      company_id: companyId,
      userRole: UserRole.OWNER,
      poolType: 'users',
    };
  }

  private decodeJwtClaims(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = Buffer.from(padded, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
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

  // ──────────────────────────────────────────────────────────────────────────
  // Phone verification methods
  // ──────────────────────────────────────────────────────────────────────────

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendPhoneCode(email: string, poolType: 'users' | 'customer' = 'customer'): Promise<{ ok: boolean; phone_hint: string }> {
    const trimmedEmail = email.trim();

    // Fetch phone number from Cognito user attributes
    const attrs = await this.cognitoService.getUserAttributes(trimmedEmail, poolType);
    const phoneNumber = attrs['phone_number'];

    if (!phoneNumber) {
      throw new BadRequestException('No phone number on file. Please update your phone number first.');
    }

    const code = this.generateSixDigitCode();
    const expiresAt = Math.floor(Date.now() / 1000) + PHONE_CODE_TTL_SECONDS;

    await this.dynamodbService.put(PHONE_VERIFY_TABLE, {
      email: trimmedEmail,
      pool_type: poolType,
      code,
      expires_at: expiresAt,
    });

    await this.smsService.sendSms(
      phoneNumber,
      `Your HandyCall verification code is: ${code}. It expires in 10 minutes.`,
    );

    return { ok: true, phone_hint: phoneNumber };
  }

  async verifyPhoneCode(email: string, code: string, poolType: 'users' | 'customer' = 'customer'): Promise<{ ok: boolean }> {
    const trimmedEmail = email.trim();

    const record = await this.dynamodbService.get(PHONE_VERIFY_TABLE, {
      email: trimmedEmail,
      pool_type: poolType,
    });

    if (!record) {
      throw new BadRequestException('No pending phone verification found. Please request a new code.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.expires_at && record.expires_at < nowSeconds) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (record.code !== code.trim()) {
      throw new BadRequestException('Incorrect verification code. Please try again.');
    }

    // Mark phone as verified in Cognito
    await this.cognitoService.updateUserAttributes(
      trimmedEmail,
      { phone_number_verified: 'true' },
      poolType,
    );

    // Clean up verification record
    await this.dynamodbService.delete(PHONE_VERIFY_TABLE, {
      email: trimmedEmail,
      pool_type: poolType,
    });

    return { ok: true };
  }

  async updatePhoneAndResend(email: string, phoneNumber: string, poolType: 'users' | 'customer' = 'customer'): Promise<{ ok: boolean; phone_hint: string }> {
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!isValidPhoneNumber(trimmedPhone)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format: +12223334444');
    }

    const formattedPhone = formatPhoneNumber(trimmedPhone);

    // Update phone in Cognito
    await this.cognitoService.updateUserAttributes(
      trimmedEmail,
      {
        phone_number: formattedPhone,
        phone_number_verified: 'false',
      },
      poolType,
    );

    // For customers, also update the customer_profiles record
    if (poolType === 'customer') {
      const profile = await this.customerProfilesService.getByUserId(trimmedEmail);
      if (profile) {
        await this.customerProfilesService.update(trimmedEmail, { phone: formattedPhone });
      }
    }

    // Send new SMS code to the updated number
    return this.sendPhoneCode(trimmedEmail, poolType);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Login SMS OTP (2-step login)
  // ──────────────────────────────────────────────────────────────────────────

  async preLogin(email: string, password: string, poolType: 'users' | 'customer' = 'customer'): Promise<{ pre_login_session: string; phone: string }> {
    const trimmedEmail = email.trim();

    // 1. Validate credentials — get the real Cognito tokens
    let loginResult: any;
    try {
      loginResult = await this.cognitoService.login(trimmedEmail, password, poolType);
    } catch (err: any) {
      // Re-throw auth errors unchanged (wrong password, etc.)
      throw err;
    }

    // 2. Get the phone number from Cognito
    const attrs = await this.cognitoService.getUserAttributes(trimmedEmail, poolType);
    const phoneNumber = attrs['phone_number'];
    if (!phoneNumber) {
      throw new BadRequestException('No phone number on file. Please contact support.');
    }

    // 3. Generate OTP + session ID
    const sessionId = uuidv4();
    const otp = this.generateSixDigitCode();
    const expiresAt = Math.floor(Date.now() / 1000) + LOGIN_OTP_TTL_SECONDS;

    // 4. Store everything in DynamoDB (tokens + otp + session)
    await this.dynamodbService.put(LOGIN_OTP_TABLE, {
      session_id: sessionId,
      email: trimmedEmail,
      pool_type: poolType,
      otp,
      expires_at: expiresAt,
      id_token: loginResult.idToken,
      access_token: loginResult.accessToken,
      refresh_token: loginResult.refreshToken || null,
      user_attributes: loginResult.userAttributes || {},
    });

    // 5. Send SMS
    await this.smsService.sendSms(
      phoneNumber,
      `Your HandyCall login code is: ${otp}. It expires in 5 minutes.`,
    );

    return { pre_login_session: sessionId, phone: phoneNumber };
  }

  async verifyLoginOtp(sessionId: string, otp: string, poolType: 'users' | 'customer' = 'customer'): Promise<any> {
    const record = await this.dynamodbService.get(LOGIN_OTP_TABLE, { session_id: sessionId });

    if (!record) {
      throw new BadRequestException('Login session not found or expired. Please sign in again.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.expires_at && record.expires_at < nowSeconds) {
      throw new BadRequestException('Login code has expired. Please sign in again.');
    }

    if (record.otp !== otp.trim()) {
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    // Delete session — single use
    await this.dynamodbService.delete(LOGIN_OTP_TABLE, { session_id: sessionId });

    // Return the stored Cognito tokens + user info so NextAuth can build its session
    return {
      email: record.email,
      id_token: record.id_token,
      access_token: record.access_token,
      refresh_token: record.refresh_token,
      pool_type: record.pool_type,
      user_attributes: record.user_attributes || {},
    };
  }

  async deleteUnverifiedAccount(email: string, poolType: 'users' | 'customer' = 'customer'): Promise<{ ok: boolean }> {
    const trimmedEmail = email.trim();

    // Safety check: only delete if there IS a pending phone verification record.
    // This prevents this endpoint from being abused to delete arbitrary accounts.
    const record = await this.dynamodbService.get(PHONE_VERIFY_TABLE, {
      email: trimmedEmail,
      pool_type: poolType,
    });

    if (!record) {
      // No pending verification — either already verified or never started.
      // Return ok silently to avoid revealing account existence.
      return { ok: true };
    }

    // Delete verification record first
    await this.dynamodbService.delete(PHONE_VERIFY_TABLE, {
      email: trimmedEmail,
      pool_type: poolType,
    });

    // Delete the Cognito user
    try {
      await this.cognitoService.deleteUser(trimmedEmail, poolType);
    } catch {
      // Ignore if user was already deleted
    }

    // For customers, delete the DynamoDB profile record
    if (poolType === 'customer') {
      const profile = await this.customerProfilesService.getByUserId(trimmedEmail).catch(() => null);
      if (profile) {
        await this.customerProfilesService.deleteByUserId(trimmedEmail).catch(() => null);
      }
    }

    return { ok: true };
  }
}
