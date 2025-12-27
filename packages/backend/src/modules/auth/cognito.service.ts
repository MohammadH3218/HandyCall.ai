import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminGetUserCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

export interface CognitoLoginResult {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  challengeName?: string;
  session?: string;
  userAttributes?: Record<string, string>;
  poolType?: 'users' | 'admin';
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

    this.adminPoolId = this.configService.get<string>('AWS_COGNITO_ADMIN_POOL_ID')!;
    this.adminClientId = this.configService.get<string>('AWS_COGNITO_ADMIN_CLIENT_ID')!;
    this.adminClientSecret = this.configService.get<string>('AWS_COGNITO_ADMIN_CLIENT_SECRET')!;
  }

  private calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    const message = username + clientId;
    const hmac = createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  async login(email: string, password: string, poolType: 'users' | 'admin' | 'auto' = 'auto'): Promise<CognitoLoginResult & { poolType: 'users' | 'admin' }> {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[CognitoService.login] STARTED - email: ${email}, poolType: ${poolType}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Try both pools if auto, otherwise use specified pool
    const poolsToTry = poolType === 'auto' 
      ? [
          { type: 'users' as const, poolId: this.usersPoolId, clientId: this.usersClientId, clientSecret: this.usersClientSecret },
          { type: 'admin' as const, poolId: this.adminPoolId, clientId: this.adminClientId, clientSecret: this.adminClientSecret }
        ]
      : poolType === 'users'
      ? [{ type: 'users' as const, poolId: this.usersPoolId, clientId: this.usersClientId, clientSecret: this.usersClientSecret }]
      : [{ type: 'admin' as const, poolId: this.adminPoolId, clientId: this.adminClientId, clientSecret: this.adminClientSecret }];

    console.log(`[CognitoService] Will try ${poolsToTry.length} pool(s): ${poolsToTry.map(p => p.type).join(', ')}`);

    let lastError: any;

    for (const pool of poolsToTry) {
      console.log(`[CognitoService] ═══ Attempting login with ${pool.type} pool for: ${email} ═══`);
      const secretHash = this.calculateSecretHash(email, pool.clientId, pool.clientSecret);

      try {
        const command = new AdminInitiateAuthCommand({
          UserPoolId: pool.poolId,
          ClientId: pool.clientId,
          AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: secretHash,
          },
        });

        console.log(`[CognitoService] Sending auth command to ${pool.type} pool (PoolId: ${pool.poolId})`);
        const response = await this.cognitoClient.send(command);
        console.log(`[CognitoService] ✅ Successfully authenticated with ${pool.type} pool`);

        // Check if user needs to change password (first login with temp password)
        if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
          return {
            accessToken: '',
            idToken: '',
            challengeName: 'NEW_PASSWORD_REQUIRED',
            session: response.Session,
            userAttributes: {},
            poolType: pool.type,
          };
        }

        if (!response.AuthenticationResult) {
          throw new UnauthorizedException('Authentication failed');
        }

        // Get user attributes
        const userAttributes = await this.getUserAttributes(email, pool.type);

        return {
          accessToken: response.AuthenticationResult.AccessToken!,
          idToken: response.AuthenticationResult.IdToken!,
          refreshToken: response.AuthenticationResult.RefreshToken,
          userAttributes,
          poolType: pool.type,
        };
      } catch (error: any) {
        const errorName = error.name || error.__type;
        const errorMessage = error.message || 'Unknown error';
        console.error(`[CognitoService] ❌ Login failed with ${pool.type} pool`);
        console.error(`[CognitoService] Error type: ${errorName}, message: ${errorMessage}`);
        if (error.$metadata) {
          console.error(`[CognitoService] AWS metadata:`, error.$metadata);
        }
        lastError = error;
        
        // If user not found or unauthorized, try next pool. Otherwise, rethrow
        if (errorName !== 'UserNotFoundException' && errorName !== 'NotAuthorizedException') {
          console.error(`[CognitoService] Non-retryable error, throwing immediately: ${errorName}`);
          throw error;
        }
        
        // Check if there's another pool to try
        const currentPoolIndex = poolsToTry.findIndex(p => p.type === pool.type);
        const hasMorePools = currentPoolIndex < poolsToTry.length - 1;
        
        if (hasMorePools) {
          console.log(`[CognitoService] Will try next pool after ${pool.type} pool failed with ${errorName}`);
        } else {
          console.error(`[CognitoService] No more pools to try. Last error was from ${pool.type} pool`);
        }
        // Continue to next pool if this one failed
        continue;
      }
    }

    // If we get here, both pools failed
    console.error('Both pools failed. Last error:', lastError);
    const errorName = lastError?.name || lastError?.__type;
    if (errorName === 'NotAuthorizedException' || errorName === 'UserNotFoundException') {
      console.error('Throwing UnauthorizedException: Invalid email or password');
      throw new UnauthorizedException('Invalid email or password');
    }
    throw lastError || new UnauthorizedException('Authentication failed');
  }

  async respondToNewPasswordChallenge(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' = 'users'
  ): Promise<CognitoLoginResult & { poolType: 'users' | 'admin' }> {
    const poolId = poolType === 'users' ? this.usersPoolId : this.adminPoolId;
    const clientId = poolType === 'users' ? this.usersClientId : this.adminClientId;
    const clientSecret = poolType === 'users' ? this.usersClientSecret : this.adminClientSecret;
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

      // Get user attributes
      const userAttributes = await this.getUserAttributes(email, poolType);

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        userAttributes,
        poolType,
      };
    } catch (error: any) {
      console.error('New password challenge error:', error);
      throw new BadRequestException('Failed to set new password');
    }
  }

  async getUserAttributes(email: string, poolType: 'users' | 'admin' = 'users'): Promise<Record<string, string>> {
    const poolId = poolType === 'users' ? this.usersPoolId : this.adminPoolId;
    
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
      console.error('Failed to get user attributes:', error);
      return {};
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
}
