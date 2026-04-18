import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { user_id: string; user_type: string; email: string } | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.user_type !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
