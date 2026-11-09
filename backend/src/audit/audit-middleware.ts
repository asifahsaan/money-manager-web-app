import { Prisma } from '@prisma/client';
import { AuditAction, auditStorage } from './audit-context';

// The account's own records. Users, settings and attachments are left out.
export const TRACKED_MODELS = new Set(['Wallet', 'Category', 'Transaction', 'Budget', 'Goal', 'GoalEntry', 'Debt', 'DebtEntry', 'Recurring']);

const WRITES = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

/**
 * Plain JSON copy of the row's own columns: Decimals become strings and dates
 * ISO strings. Related records a query included (wallet, category…) are dropped.
 */
const plain = (row: unknown) => {
  if (row == null) return null;
  const copy = JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
  for (const [k, v] of Object.entries(copy)) {
    const related = v !== null && typeof v === 'object' && (!Array.isArray(v) || v.some((x) => x !== null && typeof x === 'object'));
    if (related) delete copy[k];
  }
  return copy;
};

/** The scalar values an updateMany sets ({ increment } and the like are left out). */
function setValues(data: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries((data ?? {}) as Record<string, unknown>)) {
    if (v === null || typeof v !== 'object' || v instanceof Date || Array.isArray(v)) out[k] = v;
  }
  return out;
}

/**
 * Notes every write to a tracked model made while a request is being handled,
 * with the row before and after. The "before" read goes through `next`, so
 * inside a transaction it reads through that same transaction.
 */
export const auditMiddleware: Prisma.Middleware = async (params, next) => {
  const store = auditStorage.getStore();
  if (!store || !params.model || !TRACKED_MODELS.has(params.model) || !WRITES.has(params.action)) return next(params);

  const where = params.args?.where;
  let before: unknown[] = [];
  if (params.action === 'update' || params.action === 'delete' || params.action === 'upsert') {
    const row = await next({ ...params, action: 'findUnique', args: { where } });
    before = row ? [row] : [];
  } else if (params.action === 'updateMany' || params.action === 'deleteMany') {
    before = (await next({ ...params, action: 'findMany', args: { where, take: 500 } })) as unknown[];
  }

  const result = await next(params);

  const add = (action: AuditAction, b: unknown, a: unknown) => {
    const after = plain(a);
    const prev = plain(b);
    // An empty relation comes back as null, which looks like a column: keep only the row's own columns
    if (prev && after) for (const k of Object.keys(after)) if (!(k in prev)) delete after[k];
    const id = (after?.id ?? prev?.id) as number | undefined;
    store.changes.push({ entity: params.model!, entityId: typeof id === 'number' ? id : null, action, before: prev, after, at: new Date() });
  };

  switch (params.action) {
    case 'create':
      add('created', null, result);
      break;
    case 'createMany': {
      const rows = params.args?.data;
      for (const row of Array.isArray(rows) ? rows : [rows]) add('created', null, row);
      break;
    }
    case 'update':
      add('updated', before[0] ?? null, result);
      break;
    case 'upsert':
      add(before.length ? 'updated' : 'created', before[0] ?? null, result);
      break;
    case 'updateMany': {
      const set = setValues(params.args?.data);
      for (const row of before) add('updated', row, { ...(row as object), ...set });
      break;
    }
    case 'delete':
      add('deleted', before[0] ?? result, null);
      break;
    case 'deleteMany':
      for (const row of before) add('deleted', row, null);
      break;
  }
  return result;
};
