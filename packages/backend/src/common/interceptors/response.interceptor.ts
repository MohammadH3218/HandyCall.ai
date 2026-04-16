import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(_context: ExecutionContext, next: CallHandler): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = next.handle() as any;
    return handle.pipe(
      map((data: any) => ({
        success: true,
        data,
        meta: { timestamp: Date.now() },
      })),
    );
  }
}
