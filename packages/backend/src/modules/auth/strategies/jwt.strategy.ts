import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AuthContext } from '@handycall/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const userPoolId = configService.get<string>('AWS_COGNITO_USERS_POOL_ID');
    const region = configService.get<string>('AWS_REGION');
    const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: configService.get<string>('AWS_COGNITO_USERS_CLIENT_ID'),
      issuer: authority,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authority}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any): Promise<AuthContext> {
    // Extract user info from Cognito token
    const userId = payload.sub;
    const companyId = payload['custom:company_id'] || 'no-company';
    const groups = payload['cognito:groups'] || [];

    // Determine role from Cognito groups or attributes
    let role = payload['custom:role'] || 'owner';
    if (groups.includes('admin')) {
      role = 'admin';
    }

    return {
      user_id: userId,
      company_id: companyId,
      role: role as any,
    };
  }
}
