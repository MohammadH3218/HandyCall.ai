import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../../infrastructure/database/dynamodb.service';
import { MarketplaceAuthContext, UserRole, UserType } from '@handycall/shared';

interface JwtPayload {
  user_id: string;
  user_type: UserType | 'ADMIN';
  email: string;
  role?: UserRole;
  company_id?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private db: DynamoDBService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<MarketplaceAuthContext | Record<string, any>> {
    const { user_id, user_type, email, role, company_id } = payload;

    if (!user_id || !user_type || !email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (user_type === 'ADMIN') {
      return {
        user_id,
        user_type,
        email,
        role: role || UserRole.ADMIN,
        company_id: company_id || 'platform-admin',
      };
    }

    // Lightweight check — confirm user still exists and is not suspended
    const table = user_type === 'CUSTOMER' ? 'customers' : 'pros';
    const pkField = user_type === 'CUSTOMER' ? 'customer_id' : 'pro_id';
    const user = await this.db.get(table, { [pkField]: user_id });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    return { user_id, user_type, email };
  }
}
