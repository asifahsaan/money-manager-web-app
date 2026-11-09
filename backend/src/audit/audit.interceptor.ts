import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request } from 'express';
import { concatMap, Observable } from 'rxjs';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { auditStorage, AuditStore } from './audit-context';
import { AuditService } from './audit.service';

/**
 * Wraps every signed-in write request so the Prisma middleware can note what
 * it changes, then saves those notes once the request has succeeded — a
 * request that fails (and rolls back) leaves nothing in the log.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    if (req.method === 'GET' || !req.user?.sub) return next.handle();

    const store: AuditStore = {
      userId: req.user.sub,
      requestId: randomUUID(),
      method: req.method,
      path: (req.originalUrl ?? req.url).split('?')[0].slice(0, 200),
      changes: [],
    };
    return new Observable((subscriber) =>
      auditStorage.run(store, () =>
        next
          .handle()
          .pipe(
            concatMap(async (value) => {
              await this.audit.save(store);
              return value;
            }),
          )
          .subscribe(subscriber),
      ),
    );
  }
}
