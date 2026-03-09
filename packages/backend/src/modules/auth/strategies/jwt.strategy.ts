import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AuthContext } from '@handycall/shared';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const userPoolId = configService.get<string>('AWS_COGNITO_USERS_POOL_ID');
    const region = configService.get<string>('AWS_REGION');
    const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: configService.get<string>('AWS_COGNITO_USERS_CLIENT_ID'),
      issuer: authority,
      algorithms: ['RS256'], // Cognito uses RS256 signature
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authority}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any): Promise<AuthContext> {
    const email = payload.email || payload['cognito:username'] || payload.username;
    const companyIdFromToken =
      payload['custom:company_id'] || payload.company_id || payload['company_id'];

    if (!email) {
      this.logger.error('Token is valid but contains no email/username claim');
      throw new UnauthorizedException('Invalid token claims');
    }

    let user = null;
    if (companyIdFromToken) {
      user = await this.usersService.findByEmailForCompany(email, companyIdFromToken);
      if (!user) {
        this.logger.warn(
          `User with email ${email} was not found for company ${companyIdFromToken}. Rejecting token.`
        );
        throw new UnauthorizedException('User not found in system');
      }
    } else {
      user = await this.usersService.findByEmail(email);
      if (!user) {
        this.logger.warn(`User with email ${email} not found in database. Rejecting token.`);
        throw new UnauthorizedException('User not found in system');
      }
    }

    return {
      user_id: user.user_id,
      company_id: user.company_id,
      role: user.role,
    };
  }
}
