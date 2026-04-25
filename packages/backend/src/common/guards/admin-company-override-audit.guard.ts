import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@handycall/shared';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';

@Injectable()
export class AdminCompanyOverrideAuditGuard implements CanActivate {
  constructor(private readonly auditLogs: AuditLogsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: { role?: UserRole; company_id?: string };
    }>();

    const headerValue = request.headers?.['x-company-id'];
    const overrideCompanyId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!overrideCompanyId) {
      return true;
    }

    const user = request.user;
    const isAdmin =
      user?.role === UserRole.ADMIN || user?.company_id === 'platform-admin';

    await this.auditLogs.logFromRequest(request as any, {
      category: isAdmin ? 'ADMIN' : 'SECURITY',
      severity: isAdmin ? 'INFO' : 'WARN',
      outcome: isAdmin ? 'SUCCESS' : 'DENIED',
      action: isAdmin
        ? 'admin.company_context_override_used'
        : 'security.company_context_override_rejected',
      target_type: 'company',
      target_id: String(overrideCompanyId),
    });

    return true;
  }
}
