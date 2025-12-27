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
}

@Injectable()
export class CognitoService {
  private cognitoClient: CognitoIdentityProviderClient;
  private usersPoolId: string;
  private usersClientId: string;
  private usersClientSecret: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    this.cognitoClient = new CognitoIdentityProviderClient({ region });

    this.usersPoolId = this.configService.get<string>('AWS_COGNITO_USERS_POOL_ID')!;
    this.usersClientId = this.configService.get<string>('AWS_COGNITO_USERS_CLIENT_ID')!;
    this.usersClientSecret = this.configService.get<string>('AWS_COGNITO_USERS_CLIENT_SECRET')!;
  }

  private calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    const message = username + clientId;
    const hmac = createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  async login(email: string, password: string): Promise<CognitoLoginResult> {
    const secretHash = this.calculateSecretHash(email, this.usersClientId, this.usersClientSecret);

    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.usersPoolId,
        ClientId: this.usersClientId,
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
        };
      }

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Authentication failed');
      }

      // Get user attributes
      const userAttributes = await this.getUserAttributes(email);

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        userAttributes,
      };
    } catch (error: any) {
      console.error('Cognito login error:', error);
      if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  async respondToNewPasswordChallenge(
    email: string,
    newPassword: string,
    session: string
  ): Promise<CognitoLoginResult> {
    const secretHash = this.calculateSecretHash(email, this.usersClientId, this.usersClientSecret);

    try {
      const command = new AdminRespondToAuthChallengeCommand({
        UserPoolId: this.usersPoolId,
        ClientId: this.usersClientId,
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
      const userAttributes = await this.getUserAttributes(email);

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        userAttributes,
      };
    } catch (error: any) {
      console.error('[CognitoService] New password challenge error:', error);
      console.error('[CognitoService] Error details:', {
        name: error.name,
        message: error.message,
        code: error.$metadata?.httpStatusCode,
      });
      
      // Re-throw the original error to preserve error type and message
      if (error.name === 'NotAuthorizedException') {
        throw error; // Let AuthService handle this with better message
      }
      
      throw new BadRequestException(error.message || 'Failed to set new password');
    }
  }

  async getUserAttributes(email: string): Promise<Record<string, string>> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.usersPoolId,
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
