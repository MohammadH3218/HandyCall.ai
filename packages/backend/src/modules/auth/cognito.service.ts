import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand,
  AuthFlowType,
  ChallengeNameType,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

export interface CognitoLoginResult {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  challengeName?: string;
  session?: string;
  userAttributes?: Record<string, string>;
  poolType?: 'users' | 'admin'; // Track which pool was used
}

@Injectable()
export class CognitoService {
  private cognitoClient: CognitoIdentityProviderClient;
  private usersPoolId: string;
  private usersClientId: string;
  private usersClientSecret: string;
  private adminPoolId: string;
  private adminClientId: string;
  private adminClientSecret: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    this.cognitoClient = new CognitoIdentityProviderClient({ region });

    this.usersPoolId = this.configService.get<string>('AWS_COGNITO_USERS_POOL_ID')!;
    this.usersClientId = this.configService.get<string>('AWS_COGNITO_USERS_CLIENT_ID')!;
    this.usersClientSecret = this.configService.get<string>('AWS_COGNITO_USERS_CLIENT_SECRET')!;
    
    // Admin pool credentials (optional - may not be set in all environments)
    this.adminPoolId = this.configService.get<string>('AWS_COGNITO_ADMIN_POOL_ID') || '';
    this.adminClientId = this.configService.get<string>('AWS_COGNITO_ADMIN_CLIENT_ID') || '';
    this.adminClientSecret = this.configService.get<string>('AWS_COGNITO_ADMIN_CLIENT_SECRET') || '';
  }

  private calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    const message = username + clientId;
    const hmac = createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  async login(email: string, password: string, poolType: 'auto' | 'users' | 'admin' = 'auto'): Promise<CognitoLoginResult> {
    const poolsToTry: Array<'users' | 'admin'> = poolType === 'auto' ? ['users', 'admin'] : [poolType];

    let lastError: any = null;

    for (const pool of poolsToTry) {
      try {
        const result = await this.loginWithPool(email, password, pool);
        return result;
      } catch (error: any) {
        lastError = error;
        const poolIndex = poolsToTry.indexOf(pool);
        const isLastPool = poolIndex === poolsToTry.length - 1;
        
        // If this is NotAuthorizedException and we have more pools to try, continue
        // Otherwise, let it fall through to handle after the loop
        if (error.name === 'NotAuthorizedException' && !isLastPool) {
          continue;
        }
        
        // For non-NotAuthorizedException errors, throw immediately
        // For NotAuthorizedException on the last pool, fall through to handle after loop
        if (error.name !== 'NotAuthorizedException' && error.name !== 'UserNotFoundException') {
          throw error;
        }
      }
    }

    // If we get here, all pools failed
    if (lastError?.name === 'NotAuthorizedException' || lastError?.name === 'UserNotFoundException') {
      throw new UnauthorizedException('Invalid email or password');
    }
    throw lastError || new UnauthorizedException('Authentication failed');
  }

  private async loginWithPool(email: string, password: string, poolType: 'users' | 'admin'): Promise<CognitoLoginResult> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;
    const clientId = poolType === 'admin' ? this.adminClientId : this.usersClientId;
    const clientSecret = poolType === 'admin' ? this.adminClientSecret : this.usersClientSecret;

    if (!poolId || !clientId || !clientSecret) {
      throw new UnauthorizedException(`Pool ${poolType} not configured`);
    }

    const secretHash = this.calculateSecretHash(email, clientId, clientSecret);

    const command = new AdminInitiateAuthCommand({
      UserPoolId: poolId,
      ClientId: clientId,
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    });

    const response = await this.cognitoClient.send(command);

    // Check if user needs to change password (first login with temp password)
    if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
      return {
        accessToken: '',
        idToken: '',
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: response.Session,
        userAttributes: {},
        poolType,
      };
    }

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('Authentication failed');
    }

    // Get user attributes from the correct pool
    const userAttributes = await this.getUserAttributes(email, poolType);

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: response.AuthenticationResult.RefreshToken,
      userAttributes,
      poolType,
    };
  }

  async respondToNewPasswordChallenge(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' = 'users'
  ): Promise<CognitoLoginResult> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;
    const clientId = poolType === 'admin' ? this.adminClientId : this.usersClientId;
    const clientSecret = poolType === 'admin' ? this.adminClientSecret : this.usersClientSecret;

    if (!poolId || !clientId || !clientSecret) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    const secretHash = this.calculateSecretHash(email, clientId, clientSecret);

    try {
      const command = new AdminRespondToAuthChallengeCommand({
        UserPoolId: poolId,
        ClientId: clientId,
        ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword,
          SECRET_HASH: secretHash,
        },
        Session: session,
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new BadRequestException('Failed to set new password');
      }

      // Get user attributes from the correct pool
      const userAttributes = await this.getUserAttributes(email, poolType);

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        userAttributes,
        poolType,
      };
    } catch (error: any) {
      console.error('[CognitoService] New password challenge error:', error);
      console.error('[CognitoService] Error details:', {
        name: error.name,
        message: error.message,
        code: error.$metadata?.httpStatusCode,
        poolType,
      });
      
      // Re-throw the original error to preserve error type and message
      if (error.name === 'NotAuthorizedException') {
        throw error; // Let AuthService handle this with better message
      }
      
      throw new BadRequestException(error.message || 'Failed to set new password');
    }
  }

  async userExists(email: string, poolType: 'users' | 'admin' = 'users'): Promise<boolean> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;
    if (!poolId) return false;

    try {
      await this.cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: poolId,
          Username: email,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return false;
      }
      // For other errors, bubble up so callers can decide
      throw error;
    }
  }

  async getUserAttributes(email: string, poolType: 'users' | 'admin' = 'users'): Promise<Record<string, string>> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;
    
    if (!poolId) {
      console.warn(`[CognitoService] Pool ${poolType} not configured, cannot get user attributes`);
      return {};
    }

    try {
      const command = new AdminGetUserCommand({
        UserPoolId: poolId,
        Username: email,
      });

      const response = await this.cognitoClient.send(command);
      const attributes: Record<string, string> = {};

      response.UserAttributes?.forEach((attr) => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });

      return attributes;
    } catch (error) {
      console.error(`[CognitoService] Failed to get user attributes from ${poolType} pool:`, error);
      return {};
    }
  }

  async updateUserAttributes(
    email: string,
    attributes: Record<string, string>,
    poolType: 'users' | 'admin' = 'users'
  ): Promise<void> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: poolId,
        Username: email,
        UserAttributes: userAttributes,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('[CognitoService] Failed to update user attributes:', error);
      throw new BadRequestException(`Failed to update user attributes: ${error.message}`);
    }
  }

  async refreshAccessToken(refreshToken: string, username: string): Promise<{accessToken: string; idToken: string}> {
    const secretHash = this.calculateSecretHash(username, this.usersClientId, this.usersClientSecret);

    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.usersPoolId,
        ClientId: this.usersClientId,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          SECRET_HASH: secretHash,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Token refresh failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Create a new user in Cognito user pool
   */
  async createUser(
    email: string,
    tempPassword: string,
    companyId?: string,
    name?: string,
    poolType: 'users' | 'admin' = 'users'
  ): Promise<void> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const userAttributes = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ];

      if (poolType === 'users' && companyId) {
        userAttributes.push({ Name: 'custom:company_id', Value: companyId });
      }

      if (name) {
        userAttributes.push({ Name: 'name', Value: name });
        const parts = name.split(' ');
        if (parts[0]) userAttributes.push({ Name: 'given_name', Value: parts[0] });
        if (parts.slice(1).join(' ')) {
          userAttributes.push({ Name: 'family_name', Value: parts.slice(1).join(' ') });
        }
      }

      const command = new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: email,
        UserAttributes: userAttributes,
        TemporaryPassword: tempPassword,
        MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
      });

      await this.cognitoClient.send(command);

      // Set permanent password immediately
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: email,
        Password: tempPassword,
        Permanent: true,
      });

      await this.cognitoClient.send(setPasswordCommand);
    } catch (error: any) {
      console.error('[CognitoService] Failed to create user:', error);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Delete a user from Cognito
   */
  async deleteUser(email: string, poolType: 'users' | 'admin' = 'users'): Promise<void> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: poolId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('[CognitoService] Failed to delete user:', error);
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Disable a user account
   */
  async disableUser(email: string, poolType: 'users' | 'admin' = 'users'): Promise<void> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: poolId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('[CognitoService] Failed to disable user:', error);
      throw new BadRequestException(`Failed to disable user: ${error.message}`);
    }
  }

  /**
   * Enable a user account
   */
  async enableUser(email: string, poolType: 'users' | 'admin' = 'users'): Promise<void> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: poolId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('[CognitoService] Failed to enable user:', error);
      throw new BadRequestException(`Failed to enable user: ${error.message}`);
    }
  }

  /**
   * List all users in a pool (with pagination)
   */
  async listUsers(poolType: 'users' | 'admin' = 'users', limit = 60): Promise<any[]> {
    const poolId = poolType === 'admin' ? this.adminPoolId : this.usersPoolId;

    if (!poolId) {
      throw new BadRequestException(`Pool ${poolType} not configured`);
    }

    try {
      const command = new ListUsersCommand({
        UserPoolId: poolId,
        Limit: limit,
      });

      const response = await this.cognitoClient.send(command);
      return response.Users || [];
    } catch (error: any) {
      console.error('[CognitoService] Failed to list users:', error);
      throw new BadRequestException(`Failed to list users: ${error.message}`);
    }
  }
}
