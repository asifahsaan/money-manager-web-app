import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditStore } from './audit-context';

// Fields the app keeps up to date by itself. An update that changes only these
// is a follow-on of another change (a wallet's balance after a transaction).
const DERIVED: Record<string, string[]> = {
  Wallet: ['currentBalance'],
  Debt: ['settledAmount', 'remainingAmount', 'status'],
  Goal: ['savedAmount'],
  Recurring: ['nextOccurrence'],
};
const IGNORED = new Set(['updatedAt', 'createdAt']);

export interface AuditQuery {
  accountId: number;
  page: number;
  limit: number;
  entity?: string;
  action?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Writes what a request changed. Never fails the request: a log problem is only reported. */
  async save(store: AuditStore) {
    if (!store.changes.length) return;
    try {
      const rows = await this.toRows(store);
      if (rows.length) await this.prisma.auditLog.createMany({ data: rows });
    } catch (err) {
      this.logger.error(`Could not write the activity log for ${store.method} ${store.path}`, err as Error);
    }
  }

  private async toRows(store: AuditStore): Promise<Prisma.AuditLogCreateManyInput[]> {
    // Debt and goal entries carry no accountId: take it from their parent,
    // seen in this same request if it was deleted with them
    const parents = new Map<string, number>();
    for (const c of store.changes) {
      const row = c.after ?? c.before;
      if ((c.entity === 'Debt' || c.entity === 'Goal') && row && typeof row.accountId === 'number') parents.set(`${c.entity}:${row.id}`, row.accountId);
    }
    const accountOf = async (entity: string, row: Record<string, unknown>) => {
      if (typeof row.accountId === 'number') return row.accountId;
      const [model, key] = entity === 'DebtEntry' ? ['Debt', 'debtId'] : entity === 'GoalEntry' ? ['Goal', 'goalId'] : [null, null];
      const parentId = key ? row[key] : null;
      if (!model || typeof parentId !== 'number') return null;
      if (!parents.has(`${model}:${parentId}`)) {
        const parent = model === 'Debt'
          ? await this.prisma.debt.findUnique({ where: { id: parentId }, select: { accountId: true } })
          : await this.prisma.goal.findUnique({ where: { id: parentId }, select: { accountId: true } });
        if (parent) parents.set(`${model}:${parentId}`, parent.accountId);
      }
      return parents.get(`${model}:${parentId}`) ?? null;
    };

    const rows: Prisma.AuditLogCreateManyInput[] = [];
    for (const c of store.changes) {
      const row = c.after ?? c.before;
      if (!row) continue;
      const accountId = await accountOf(c.entity, row);
      if (accountId == null) continue;

      let changed: string[] = [];
      if (c.action === 'updated' && c.before && c.after) {
        changed = Object.keys(c.after).filter((k) => !IGNORED.has(k) && JSON.stringify(c.before![k]) !== JSON.stringify(c.after![k]));
        if (!changed.length) continue; // saved with nothing different
      }
      const derived = DERIVED[c.entity] ?? [];
      rows.push({
        accountId,
        userId: store.userId,
        requestId: store.requestId,
        method: store.method,
        path: store.path,
        entity: c.entity,
        entityId: c.entityId,
        action: c.action,
        changed,
        sideEffect: c.action === 'updated' && changed.every((k) => derived.includes(k)),
        before: (c.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (c.after ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: c.at,
      });
    }
    return rows;
  }

  /**
   * The log, one entry per action (a request), newest first. Filters apply to
   * the main change; each entry brings along its follow-on changes.
   */
  async list(userId: number, q: AuditQuery) {
    const acc = await this.prisma.account.findUnique({ where: { id: q.accountId }, select: { userId: true } });
    if (!acc || acc.userId !== userId) throw new ForbiddenException('Access denied');

    const where: Prisma.AuditLogWhereInput = {
      accountId: q.accountId,
      sideEffect: false,
      ...(q.entity && { entity: q.entity }),
      ...(q.action && { action: q.action }),
    };
    const groups = await this.prisma.auditLog.groupBy({
      by: ['requestId'],
      where,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });
    const total = groups.length;
    const pageIds = groups.slice((q.page - 1) * q.limit, q.page * q.limit).map((g) => g.requestId);

    const rows = pageIds.length
      ? await this.prisma.auditLog.findMany({
          where: { accountId: q.accountId, requestId: { in: pageIds } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const entries = pageIds.map((requestId) => {
      const changes = rows.filter((r) => r.requestId === requestId);
      const first = changes[0];
      return {
        requestId,
        at: changes[changes.length - 1]?.createdAt ?? first?.createdAt,
        method: first?.method,
        path: first?.path,
        changes: changes.map((r) => ({
          id: r.id,
          entity: r.entity,
          entityId: r.entityId,
          action: r.action,
          changed: r.changed,
          sideEffect: r.sideEffect,
          before: r.before,
          after: r.after,
        })),
      };
    });

    // Names for the ids in the rows, including archived wallets
    const [wallets, categories, debts, goals] = await Promise.all([
      this.prisma.wallet.findMany({ where: { accountId: q.accountId }, select: { id: true, name: true } }),
      this.prisma.category.findMany({ where: { accountId: q.accountId }, select: { id: true, name: true } }),
      this.prisma.debt.findMany({ where: { accountId: q.accountId }, select: { id: true, personName: true, description: true } }),
      this.prisma.goal.findMany({ where: { accountId: q.accountId }, select: { id: true, name: true } }),
    ]);
    const byId = <T extends { id: number }>(list: T[], name: (x: T) => string) => Object.fromEntries(list.map((x) => [x.id, name(x)]));

    return {
      entries,
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
      names: {
        wallets: byId(wallets, (w) => w.name),
        categories: byId(categories, (c) => c.name),
        debts: byId(debts, (d) => (d.description ? `${d.personName} — ${d.description}` : d.personName)),
        goals: byId(goals, (g) => g.name),
      },
    };
  }
}
