import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../../infrastructure/database/dynamodb.service';
import { MarketplaceAuthContext, UserType } from '@handycall/shared';

interface JwtPayload {
  user_id: string;
  user_type: UserType;
  email: string;
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

  async validate(payload: JwtPayload): Promise<MarketplaceAuthContext> {
    const { user_id, user_type, email } = payload;

    if (!user_id || !user_type || !email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Admin users live in Cognito only — no DynamoDB record to validate against
    if (user_type === 'ADMIN') {
      return { user_id, user_type, email };
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
