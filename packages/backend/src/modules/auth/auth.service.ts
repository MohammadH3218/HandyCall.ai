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
    const result = await this.cognitoService.login(email, password, 'auto');

    // Check if user needs to change password
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      // Determine if this is an admin user based on pool type or company_id
      const poolType = result.poolType || 'users';
      const companyId = result.userAttributes?.['custom:company_id'];
      const isAdmin = poolType === 'admin' || !companyId;
      
      return {
        requiresPasswordChange: true,
        session: result.session,
        email,
        userRole: isAdmin ? 'admin' : 'customer',
        poolType: poolType, // Include pool type so we can use it for password change
      };
    }

    // Get company and user info from DynamoDB using custom attributes
    const companyId = result.userAttributes?.['custom:company_id'];
    const poolType = result.poolType || 'users';

    // If no company_id or poolType is admin, this is an admin user
    if (!companyId || poolType === 'admin') {
      // Admin users don't have company_id - return admin role
      return {
        requiresPasswordChange: false,
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        email,
        userRole: 'admin',
        isAdmin: true,
      };
    }

    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    return {
      requiresPasswordChange: false,
      access_token: result.accessToken,
      id_token: result.idToken,
      refresh_token: result.refreshToken,
      company,
      email,
      company_id: companyId,
      userRole: 'customer',
    };
  }

  async changePassword(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' = 'users',
    companyName?: string
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
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: 'admin',
        };
      }

      // For users pool: Get company info - handle case where user might not have company_id yet
      let companyId = result.userAttributes?.['custom:company_id'];

      // If user doesn't have company_id and company_name is provided, create company
      if (!companyId && companyName) {
        // Create company with defaults for required fields
        const serviceType = ServiceType.HANDYMAN; // Default, can be updated later
        const phoneNumber = result.userAttributes?.['phone_number'] || '+10000000000'; // Placeholder, should be updated
        const timezone = result.userAttributes?.['custom:timezone'] || 'America/New_York'; // Default timezone

        const company = await this.companiesService.createCompany(
          companyName,
          serviceType,
          email,
          phoneNumber,
          timezone
        );

        companyId = company.company_id;

        // Update Cognito user attributes with company_id and company_name
        await this.cognitoService.updateUserAttributes(
          email,
          {
            'custom:company_id': companyId,
            'custom:company_name': companyName,
          },
          poolType
        );

        // Create user record in DynamoDB if it doesn't exist
        try {
          const existingUser = await this.usersService.findByEmail(email);
          if (!existingUser) {
            // Get user info from Cognito attributes
            const firstName = result.userAttributes?.['given_name'] || result.userAttributes?.['name']?.split(' ')[0] || 'User';
            const lastName = result.userAttributes?.['family_name'] || result.userAttributes?.['name']?.split(' ').slice(1).join(' ') || '';
            
            await this.usersService.createUser(
              companyId,
              email,
              '', // Password not needed, using Cognito
              firstName,
              lastName,
              UserRole.OWNER,
              phoneNumber !== '+10000000000' ? phoneNumber : undefined
            );
          }
        } catch (userError) {
          console.warn('[AuthService] Failed to create user record in DynamoDB:', userError);
          // Continue even if user creation fails - Cognito user exists
        }

        // Create default agent config
        try {
          await this.agentConfigService.createDefaultConfig(companyId);
        } catch (configError) {
          console.warn('[AuthService] Failed to create default agent config:', configError);
          // Continue even if config creation fails
        }

        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          company,
          email,
          company_id: companyId,
          userRole: 'customer',
        };
      }

      // If user doesn't have company_id and no company_name provided, require company setup
      if (!companyId) {
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: 'customer',
          requiresCompanySetup: true, // Users need company setup if no company_id
        };
      }

      // User has company_id - fetch company from DynamoDB
      const company = await this.companiesService.findById(companyId);
      
      // If company_name was provided, update it
      if (companyName && company) {
        // Update company name in DynamoDB
        await this.companiesService.updateCompany(companyId, { company_name: companyName });
        
        // Update Cognito attribute
        await this.cognitoService.updateUserAttributes(
          email,
          { 'custom:company_name': companyName },
          poolType
        );
        
        company.company_name = companyName;
      }

      if (!company) {
        // Company not found in DB, but password change succeeded
        // Return tokens but indicate company setup needed
        return {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          email,
          userRole: 'customer',
          requiresCompanySetup: true,
        };
      }

      return {
        access_token: result.accessToken,
        id_token: result.idToken,
        refresh_token: result.refreshToken,
        company,
        email,
        company_id: companyId,
        userRole: 'customer',
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
}
