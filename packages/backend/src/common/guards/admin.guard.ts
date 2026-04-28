import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@handycall/shared';

type AdminLikeUser = {
  email?: string;
  user_type?: string;
  role?: string;
  company_id?: string;
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = (request.user || {}) as AdminLikeUser;

    if (!user?.email && !user?.user_type && !user?.role) {
      throw new ForbiddenException('Admin access required');
    }

    const configuredEmails = (this.configService.get<string>('ADMIN_EMAILS') || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const normalizedEmail = user.email?.trim().toLowerCase();

    const isAdmin =
      user.user_type === 'ADMIN' ||
      user.role === UserRole.ADMIN ||
      user.company_id === 'platform-admin' ||
      (normalizedEmail ? configuredEmails.includes(normalizedEmail) : false);

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
