import { AsyncLocalStorage } from 'node:async_hooks';

export type AuditAction = 'created' | 'updated' | 'deleted';

/** One record touched by a request, as the Prisma middleware saw it. */
export interface AuditChange {
  entity: string;
  entityId: number | null;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: Date;
}

/** Everything one request changed, written to the log when the request succeeds. */
export interface AuditStore {
  userId: number;
  requestId: string;
  method: string;
  path: string;
  changes: AuditChange[];
}

export const auditStorage = new AsyncLocalStorage<AuditStore>();
