import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AuthContext, UserRole } from '@handycall/shared';
import { CustomerProfilesService } from '../../customer-profiles/customer-profiles.service';

/**
 * Dual-pool customer JWT strategy.
 *
 * Customers can arrive with tokens issued by either:
 *   1. The dedicated Customer Cognito pool  (email/password signup)
 *   2. The main Users Cognito pool          (Google / Apple OAuth)
 *
 * We skip passport-jwt's built-in issuer/audience check and do it
 * ourselves in validate() so we can accept both pools.
 */
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'jwt-customer') {
  private readonly logger = new Logger(CustomerJwtStrategy.name);
  private readonly customerAuthority: string;
  private readonly usersAuthority: string;
  private readonly customerClientId: string;

  constructor(
    private configService: ConfigService,
    private customerProfiles: CustomerProfilesService,
  ) {
    const region = configService.get<string>('AWS_REGION') || 'us-east-1';

    const customerPoolId =
      configService.get<string>('AWS_COGNITO_CUSTOMER_POOL_ID') ||
      configService.get<string>('AWS_COGNITO_CUSTOMERS_POOL_ID') ||
      '';
    const usersPoolId =
      configService.get<string>('AWS_COGNITO_USERS_POOL_ID') ||
      '';

    const customerClientId =
      configService.get<string>('AWS_COGNITO_CUSTOMER_CLIENT_ID') ||
      configService.get<string>('AWS_COGNITO_CUSTOMERS_CLIENT_ID') ||
      '';

    const customerAuthority = `https://cognito-idp.${region}.amazonaws.com/${customerPoolId}`;
    const usersAuthority = usersPoolId
      ? `https://cognito-idp.${region}.amazonaws.com/${usersPoolId}`
      : '';

    // Pre-create JWKS providers (preserves per-instance caching).
    const customerSecretProvider = passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${customerAuthority}/.well-known/jwks.json`,
    });

    const usersSecretProvider = usersAuthority
      ? passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${usersAuthority}/.well-known/jwks.json`,
        })
      : null;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Disable passport-jwt built-in issuer/audience checks — we do them manually
      // in validate() so we can accept both Cognito pools.
      issuer: undefined as any,
      audience: undefined as any,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: (err: any, secret?: any) => void) => {
        // Peek at the unverified payload to pick the right JWKS URI.
        let iss = customerAuthority; // default to customer pool
        try {
          const [, payloadB64] = rawJwtToken.split('.');
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (payload?.iss) iss = payload.iss;
        } catch {
          // use default
        }

        const useUsersPool = usersAuthority && iss === usersAuthority && usersSecretProvider;
        const provider = useUsersPool ? usersSecretProvider! : customerSecretProvider;
        provider(request, rawJwtToken, done);
      },
    });

    this.customerAuthority = customerAuthority;
    this.usersAuthority = usersAuthority;
    this.customerClientId = customerClientId;
  }

  async validate(payload: any): Promise<AuthContext> {
    // Accept tokens from either pool.
    const iss: string = payload.iss || '';
    const isCustomerPool = iss === this.customerAuthority;
    const isUsersPool = Boolean(this.usersAuthority) && iss === this.usersAuthority;

    if (!isCustomerPool && !isUsersPool) {
      this.logger.warn(`Customer JWT rejected — unknown issuer: ${iss}`);
      throw new UnauthorizedException('Invalid customer token issuer');
    }

    // For customer-pool tokens, enforce the expected audience (client ID).
    if (isCustomerPool && this.customerClientId) {
      const aud: string | string[] = payload.aud || payload.client_id || '';
      const audList = Array.isArray(aud) ? aud : [aud];
      if (!audList.includes(this.customerClientId)) {
        this.logger.warn('Customer JWT rejected — audience mismatch');
        throw new UnauthorizedException('Invalid customer token audience');
      }
    }

    const email = payload.email || payload['cognito:username'] || payload.username;
    if (!email) {
      this.logger.error('Customer token missing email/username claim');
      throw new UnauthorizedException('Invalid customer token claims');
    }

    const customerId = payload.sub || email;
    const profile = await this.customerProfiles.getByUserId(customerId);
    if (!profile) {
      this.logger.warn(`Customer JWT rejected — profile missing for ${customerId}`);
      throw new UnauthorizedException('Customer account not found');
    }

    return {
      user_id: profile?.user_id || customerId,
      company_id: 'customer-portal',
      role: UserRole.OWNER,
      email,
      pool_type: 'customer',
    };
  }
}
