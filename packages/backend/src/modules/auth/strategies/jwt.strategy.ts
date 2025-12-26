import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWTPayload, AuthContext } from '@handycall/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JWTPayload): Promise<AuthContext> {
    if (!payload.user_id || !payload.company_id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      user_id: payload.user_id,
      company_id: payload.company_id,
      role: payload.role,
    };
  }
}
