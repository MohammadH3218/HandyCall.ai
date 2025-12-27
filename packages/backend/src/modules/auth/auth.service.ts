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
    companyName: string,
    serviceType: ServiceType,
    email: string,
    password: string,
    phoneNumber: string,
    firstName: string,
    lastName: string,
    timezone: string
  ): Promise<RegisterResponse> {
    // Validate inputs
    if (!isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format (use E.164: +1234567890)');
    }

    if (!isValidTimezone(timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create company
    const company = await this.companiesService.createCompany(
      companyName,
      serviceType,
      email,
      formattedPhone,
      timezone
    );

    // Create owner user
    const user = await this.usersService.createUser(
      company.company_id,
      email,
      password,
      firstName,
      lastName,
      UserRole.OWNER,
      formattedPhone
    );

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

  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(user, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Get company
    const company = await this.companiesService.findById(user.company_id);

    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    // Check company status
    if (company.status === 'SUSPENDED' || company.status === 'CANCELLED') {
      throw new UnauthorizedException('Company account is not active');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.company_id, user.user_id);

    // Generate tokens
    const tokens = this.generateTokens(user.user_id, company.company_id, email, user.role);

    // Remove password_hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      company,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: parseInt(this.configService.get<string>('JWT_EXPIRES_IN') || '3600'),
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
  // COGNITO-BASED AUTHENTICATION
  // ========================================================================

  async loginWithCognito(email: string, password: string) {
    console.log(`[AuthService] Attempting login for: ${email}`);
    try {
      const result = await this.cognitoService.login(email, password, 'auto');
      console.log(`[AuthService] Login successful, poolType: ${result.poolType}`);
      return this.processLoginResult(result, email);
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      console.error('[AuthService] Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      throw error;
    }
  }

  private async processLoginResult(result: any, email: string) {

    // Check if user needs to change password
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      console.log(`[AuthService] Password change required for: ${email}, poolType: ${result.poolType}`);
      return {
        requiresPasswordChange: true,
        session: result.session,
        email,
        poolType: result.poolType,
      };
    }

    // For admin pool, company_id might not be required (admin users)
    const companyId = result.userAttributes?.['custom:company_id'];
    console.log(`[AuthService] Processing login result, poolType: ${result.poolType}, companyId: ${companyId || 'none'}`);

    // Admin pool users might not have company_id - that's OK for admin dashboard
    if (result.poolType === 'admin') {
      // Admin login - return admin-specific response
      console.log(`[AuthService] Admin login successful for: ${email}`);
      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        poolType: 'admin',
        company_id: companyId || null,
        company: companyId ? await this.companiesService.findById(companyId).catch(() => null) : null,
      };
    }

    // Users pool - company_id is required
    if (!companyId) {
      console.error(`[AuthService] Users pool login failed - no company_id for: ${email}`);
      throw new UnauthorizedException('User not properly configured');
    }

    const company = await this.companiesService.findById(companyId);
    if (!company) {
      console.error(`[AuthService] Users pool login failed - company not found: ${companyId}`);
      throw new UnauthorizedException('Company not found');
    }

    console.log(`[AuthService] Users pool login successful for: ${email}, company: ${companyId}`);
    return {
      requiresPasswordChange: false,
      access_token: result.accessToken,
      id_token: result.idToken,
      refresh_token: result.refreshToken,
      company,
      email,
      company_id: companyId,
      poolType: 'users',
    };
  }

  async changePassword(email: string, newPassword: string, session: string, poolType?: 'users' | 'admin'): Promise<any> {
    // If poolType not provided, try both pools (session is pool-specific, so only one will work)
    if (!poolType) {
      // Try admin pool first, then users pool
      try {
        return await this.changePassword(email, newPassword, session, 'admin');
      } catch (error) {
        return await this.changePassword(email, newPassword, session, 'users');
      }
    }
    const result = await this.cognitoService.respondToNewPasswordChallenge(
      email,
      newPassword,
      session,
      poolType
    );

    // Get company info
    const companyId = result.userAttributes?.['custom:company_id'];

    // Admin pool users might not have company_id
    if (result.poolType === 'admin') {
      return {
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        poolType: 'admin',
        company_id: companyId || null,
        company: companyId ? await this.companiesService.findById(companyId).catch(() => null) : null,
      };
    }

    // Users pool - company_id is required
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
      refresh_token: result.refreshToken,
      company,
      email,
      company_id: companyId,
      poolType: 'users',
    };
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
}
