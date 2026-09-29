import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HEAD_LABELS, EXPENSE_HEADS, INCOME_HEADS, defaultHead, isValidHead, type Head } from './heads';

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
const ZERO = new D(0);
const LARGE_EXPENSE = 50_000;

export type PeriodType = 'tax' | 'calendar';
export type Severity = 'error' | 'warning' | 'info';

export interface FindingItem {
  kind: 'transaction' | 'debt' | 'wallet';
  id: number;
  date?: string;
  label: string;
  amount?: string;
}
export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  items: FindingItem[];
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T00:00:00.000Z`);
const money = (d: Decimal) => d.toFixed(2);
const mapKey = (accountId: number) => `tax_heads_${accountId}`;

@Injectable()
export class TaxReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pakistan tax year N runs 1 July (N-1) – 30 June N (s.74 ITO 2001). */
  period(type: PeriodType, year: number) {
    return type === 'tax'
      ? { type, year, label: `Tax Year ${year} (1 Jul ${year - 1} – 30 Jun ${year})`, startDate: `${year - 1}-07-01`, endDate: `${year}-06-30` }
      : { type, year, label: `Calendar Year ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  private async account(accountId: number, userId: number) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
    return account;
  }

  // ─── Category → head mapping (defaults + user overrides) ────────────────────

  async getMapping(userId: number, accountId: number) {
    await this.account(accountId, userId);
    return this.mapping(userId, accountId);
  }

  private async mapping(userId: number, accountId: number) {
    const [categories, setting] = await Promise.all([
      this.prisma.category.findMany({
        where: { accountId },
        include: { parent: { select: { name: true } } },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.setting.findUnique({ where: { userId_key: { userId, key: mapKey(accountId) } } }),
    ]);
    let overrides: Record<string, string> = {};
    try {
      overrides = setting ? JSON.parse(setting.value) : {};
    } catch {
      overrides = {};
    }
    return categories.map((c) => {
      const override = overrides[c.id];
      const custom = !!override && isValidHead(c.type, override);
      const head = custom ? (override as Head) : defaultHead(c.type, c.name, c.parent?.name);
      return { categoryId: c.id, name: c.name, parent: c.parent?.name ?? null, type: c.type, head, custom };
    });
  }

  async saveMapping(userId: number, accountId: number, heads: Record<string, string>) {
    await this.account(accountId, userId);
    const categories = await this.prisma.category.findMany({ where: { accountId }, select: { id: true, type: true } });
    const clean: Record<number, string> = {};
    for (const c of categories) {
      const h = heads[c.id];
      if (h && isValidHead(c.type, h)) clean[c.id] = h;
    }
    await this.prisma.setting.upsert({
      where: { userId_key: { userId, key: mapKey(accountId) } },
      create: { userId, key: mapKey(accountId), value: JSON.stringify(clean) },
      update: { value: JSON.stringify(clean) },
    });
    return this.mapping(userId, accountId);
  }

  // ─── Report ──────────────────────────────────────────────────────────────────

  async getReport(userId: number, accountId: number, type: PeriodType, year: number) {
    const account = await this.account(accountId, userId);
    const period = this.period(type, year);
    const start = utc(period.startDate);
    const end = utc(period.endDate);
    const afterEnd = new Date(end.getTime() + 86_400_000);
    // One day of slack: "today" differs between Pakistan and the UTC server clock
    const tomorrow = new Date(utc(ymd(new Date())).getTime() + 86_400_000);

    const [mapping, wallets, allTx, debts, goalEntries] = await Promise.all([
      this.mapping(userId, accountId),
      this.prisma.wallet.findMany({ where: { accountId }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.transaction.findMany({
        where: { accountId },
        include: {
          category: { select: { name: true, parent: { select: { name: true } } } },
          _count: { select: { attachments: true } },
        },
        orderBy: [{ date: 'asc' }, { datetime: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.debt.findMany({ where: { accountId }, include: { entries: true } }),
      this.prisma.goalEntry.findMany({ where: { goal: { accountId } } }),
    ]);
    const headOf = new Map(mapping.map((m) => [m.categoryId, m.head]));
    const walletName = new Map(wallets.map((w) => [w.id, w.name]));

    // Wallet balances rebuilt from transactions, as of (before) a date
    const walletEffect = (t: (typeof allTx)[number]): [number, Decimal][] => {
      const amt = new D(t.amount);
      if (t.type === TransactionType.INCOME && t.walletId) return [[t.walletId, amt]];
      if (t.type === TransactionType.EXPENSE && t.walletId) return [[t.walletId, amt.negated()]];
      const out: [number, Decimal][] = [];
      if (t.fromWalletId) out.push([t.fromWalletId, amt.plus(t.feeAmount).negated()]);
      if (t.toWalletId) out.push([t.toWalletId, amt]);
      return out;
    };
    const walletsBefore = (d: Date) => {
      const bal = new Map<number, Decimal>(wallets.map((w) => [w.id, ZERO]));
      for (const t of allTx) {
        if (t.date >= d) continue;
        for (const [id, v] of walletEffect(t)) bal.set(id, (bal.get(id) ?? ZERO).plus(v));
      }
      return bal;
    };
    const goalsBefore = (d: Date) =>
      goalEntries.filter((e) => e.date < d).reduce((s, e) => (e.type === 'DEPOSIT' ? s.plus(e.amount) : s.minus(e.amount)), ZERO);
    const debtsBefore = (d: Date) => {
      let receivables = ZERO;
      let payables = ZERO;
      for (const debt of debts) {
        if (debt.date >= d) continue;
        const settled = debt.entries.filter((e) => e.date < d).reduce((s, e) => s.plus(e.amount), ZERO);
        const outstanding = D.max(ZERO, new D(debt.totalAmount).minus(settled));
        if (debt.type === 'RECEIVABLE') receivables = receivables.plus(outstanding);
        else payables = payables.plus(outstanding);
      }
      return { receivables, payables };
    };
    const snapshot = (d: Date) => {
      const bal = walletsBefore(d);
      const walletRows = wallets.map((w) => ({ id: w.id, name: w.name, amount: bal.get(w.id) ?? ZERO }));
      const walletsTotal = walletRows.reduce((s, w) => s.plus(w.amount), ZERO);
      const goals = goalsBefore(d);
      const { receivables, payables } = debtsBefore(d);
      const net = walletsTotal.plus(goals).plus(receivables).minus(payables);
      return {
        wallets: walletRows.map((w) => ({ id: w.id, name: w.name, amount: money(w.amount) })),
        walletsTotal: money(walletsTotal),
        goals: money(goals),
        receivables: money(receivables),
        payables: money(payables),
        net,
      };
    };

    // ── Income / expenses in the period ──
    const inPeriod = allTx.filter((t) => t.date >= start && t.date <= end);
    type Bucket = { head: Head; total: Decimal; categories: Map<string, { id: number | null; name: string; total: Decimal; count: number }> };
    const income = new Map<Head, Bucket>();
    const expense = new Map<Head, Bucket>();
    const add = (map: Map<Head, Bucket>, head: Head, catId: number | null, catName: string, amt: Decimal) => {
      const b = map.get(head) ?? { head, total: ZERO, categories: new Map() };
      b.total = b.total.plus(amt);
      const key = String(catId ?? catName);
      const c = b.categories.get(key) ?? { id: catId, name: catName, total: ZERO, count: 0 };
      c.total = c.total.plus(amt);
      c.count++;
      b.categories.set(key, c);
      map.set(head, b);
    };

    const appendix: { id: number; date: string; type: string; head: string; category: string; wallet: string; description: string; amount: string }[] = [];
    let openingBalancesAdded = ZERO;
    const openingBalanceItems: FindingItem[] = [];

    for (const t of inPeriod) {
      const amt = new D(t.amount);
      if (t.type === TransactionType.TRANSFER) {
        if (new D(t.feeAmount).gt(0)) {
          add(expense, 'OTHER_HOUSEHOLD', null, 'Bank / transfer charges', new D(t.feeAmount));
          appendix.push({ id: t.id, date: ymd(t.date), type: 'EXPENSE', head: HEAD_LABELS.OTHER_HOUSEHOLD, category: 'Bank / transfer charges', wallet: walletName.get(t.fromWalletId ?? -1) ?? '', description: 'Transfer fee', amount: money(new D(t.feeAmount)) });
        }
        continue;
      }
      if (t.isOpeningBalance) {
        openingBalancesAdded = openingBalancesAdded.plus(amt);
        openingBalanceItems.push({ kind: 'transaction', id: t.id, date: ymd(t.date), label: `Opening balance — ${walletName.get(t.walletId ?? -1) ?? 'wallet'}`, amount: money(amt) });
        continue;
      }
      // Loan and savings-goal movements are capital, not income or expense
      if (t.debtId || t.goalId) continue;

      const catName = t.category ? (t.category.parent ? `${t.category.parent.name} › ${t.category.name}` : t.category.name) : 'Uncategorized';
      const head: Head = t.categoryId
        ? headOf.get(t.categoryId) ?? defaultHead(t.type, t.category?.name ?? '', t.category?.parent?.name)
        : t.type === TransactionType.INCOME ? 'OTHER_SOURCES' : 'OTHER_HOUSEHOLD';
      add(t.type === TransactionType.INCOME ? income : expense, head, t.categoryId, catName, amt);
      appendix.push({
        id: t.id, date: ymd(t.date), type: t.type, head: HEAD_LABELS[head], category: catName,
        wallet: walletName.get(t.walletId ?? -1) ?? '', description: t.description ?? '', amount: money(amt),
      });
    }

    const serialize = (map: Map<Head, Bucket>, order: readonly Head[]) =>
      order
        .filter((h) => map.has(h))
        .map((h) => {
          const b = map.get(h)!;
          return {
            head: h,
            label: HEAD_LABELS[h],
            total: money(b.total),
            categories: [...b.categories.values()]
              .sort((a, z) => z.total.comparedTo(a.total))
              .map((c) => ({ id: c.id, name: c.name, total: money(c.total), count: c.count })),
          };
        });
    const sum = (map: Map<Head, Bucket>, exclude: Head) =>
      [...map.values()].filter((b) => b.head !== exclude).reduce((s, b) => s.plus(b.total), ZERO);

    const totalIncome = sum(income, 'NOT_INCOME');
    const totalExpense = sum(expense, 'NOT_EXPENSE');
    const excludedIn = income.get('NOT_INCOME')?.total ?? ZERO;
    const excludedOut = expense.get('NOT_EXPENSE')?.total ?? ZERO;

    // ── Wealth reconciliation (s.116 wealth statement) ──
    const opening = snapshot(start);
    const closing = snapshot(afterEnd);
    const nonCashDebts = debts.filter((d) => !d.walletId && d.date >= start && d.date <= end);
    const nonCashNet = nonCashDebts.reduce(
      (s, d) => (d.type === 'RECEIVABLE' ? s.plus(d.totalAmount) : s.minus(d.totalAmount)),
      ZERO,
    );
    const lines = [
      { key: 'opening', label: 'Net assets at start of period', amount: opening.net },
      { key: 'income', label: 'Add: income for the period', amount: totalIncome },
      { key: 'expenses', label: 'Less: personal expenses', amount: totalExpense.negated() },
      { key: 'openingBalances', label: 'Add: wallet opening balances entered during the period', amount: openingBalancesAdded },
      { key: 'excludedIn', label: 'Add: inflows marked "not income"', amount: excludedIn },
      { key: 'excludedOut', label: 'Less: outflows marked "not an expense"', amount: excludedOut.negated() },
      { key: 'nonCashDebts', label: 'Add/(less): loans recorded without a wallet', amount: nonCashNet },
    ];
    const expected = lines.reduce((s, l) => s.plus(l.amount), ZERO);
    const residual = closing.net.minus(expected);

    // ── Audit ──
    const findings: Finding[] = [];
    const push = (f: Finding) => f.items.length && findings.push(f);
    const allTimeBal = walletsBefore(new Date(8.64e15));

    push({
      id: 'wallet-mismatch', severity: 'error',
      title: 'Wallet balance does not match its transactions',
      detail: 'The stored balance differs from the balance rebuilt from every transaction. Totals in this report use the rebuilt balance.',
      items: wallets
        .filter((w) => !new D(w.currentBalance).equals(allTimeBal.get(w.id) ?? ZERO))
        .map((w) => ({ kind: 'wallet' as const, id: w.id, label: `${w.name}: stored ${money(new D(w.currentBalance))}, rebuilt ${money(allTimeBal.get(w.id) ?? ZERO)}` })),
    });
    push({
      id: 'unreconciled', severity: 'error',
      title: 'Wealth does not reconcile',
      detail: 'Closing net assets differ from opening assets + income − expenses after all known adjustments. Usually caused by edited debt amounts or debt entries whose date was changed.',
      items: residual.abs().gte(0.01) ? [{ kind: 'wallet', id: 0, label: 'Unexplained difference', amount: money(residual) }] : [],
    });
    const real = inPeriod.filter((t) => t.type !== TransactionType.TRANSFER && !t.isOpeningBalance && !t.debtId && !t.goalId);
    const txItem = (t: (typeof allTx)[number]): FindingItem => ({
      kind: 'transaction', id: t.id, date: ymd(t.date),
      label: t.description?.trim() || t.category?.name || (t.type === 'INCOME' ? 'Income' : t.type === 'EXPENSE' ? 'Expense' : 'Transfer'),
      amount: money(new D(t.amount)),
    });
    push({
      id: 'uncategorized', severity: 'warning',
      title: 'Transactions without a category',
      detail: 'These cannot be placed under an income head or expense head. Add a category.',
      items: real.filter((t) => !t.categoryId).map(txItem),
    });
    const groups = new Map<string, (typeof allTx)[number][]>();
    for (const t of real) {
      const k = `${t.type}|${ymd(t.date)}|${new D(t.amount).toFixed(2)}|${t.walletId}|${t.categoryId}`;
      groups.set(k, [...(groups.get(k) ?? []), t]);
    }
    push({
      id: 'duplicates', severity: 'warning',
      title: 'Possible duplicate entries',
      detail: 'Same type, date, amount, wallet and category. Delete any that were entered twice.',
      items: [...groups.values()].filter((g) => g.length > 1).flat().map(txItem),
    });
    push({
      id: 'future', severity: 'warning',
      title: 'Transactions dated in the future',
      detail: 'Check the date — future-dated entries distort balances.',
      items: allTx.filter((t) => t.date > tomorrow).map(txItem),
    });
    push({
      id: 'negative-wallet', severity: 'warning',
      title: 'Wallet with a negative balance at period end',
      detail: 'A cash or bank wallet cannot normally go below zero — usually a missing income entry or opening balance.',
      items: closing.wallets.filter((w) => new D(w.amount).lt(0)).map((w) => ({ kind: 'wallet' as const, id: w.id, label: w.name, amount: w.amount })),
    });
    push({
      id: 'loans-without-wallet', severity: 'warning',
      title: 'Loans recorded without a wallet',
      detail: 'Money lent or borrowed with no wallet means the cash side is missing; the loan still counts as an asset/liability.',
      items: nonCashDebts.map((d) => ({ kind: 'debt' as const, id: d.id, date: ymd(d.date), label: `${d.type === 'RECEIVABLE' ? 'Lent to' : 'Borrowed from'} ${d.personName}`, amount: money(new D(d.totalAmount)) })),
    });
    push({
      id: 'opening-balances', severity: 'info',
      title: 'Wallet opening balances entered during the period',
      detail: 'Money that appears as an opening balance is not income, but its source should be explainable in your wealth statement.',
      items: openingBalanceItems,
    });
    push({
      id: 'large-no-receipt', severity: 'info',
      title: `Large expenses (≥ ${LARGE_EXPENSE.toLocaleString('en-PK')}) without a receipt`,
      detail: 'Keep evidence (receipt, bank record) for large payments — see record-keeping rules in s.174.',
      items: real.filter((t) => t.type === 'EXPENSE' && new D(t.amount).gte(LARGE_EXPENSE) && t._count.attachments === 0).map(txItem),
    });
    const yearAgo = new Date(end.getTime() - 365 * 86_400_000);
    push({
      id: 'old-debts', severity: 'info',
      title: 'Loans open for more than a year',
      detail: 'Long-outstanding loans should be documented (written agreement or bank record).',
      items: debts
        .filter((d) => d.status !== 'CLOSED' && d.date < yearAgo)
        .map((d) => ({ kind: 'debt' as const, id: d.id, date: ymd(d.date), label: `${d.type === 'RECEIVABLE' ? 'Lent to' : 'Borrowed from'} ${d.personName}`, amount: money(new D(d.remainingAmount)) })),
    });

    const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
    const stripNet = (s: ReturnType<typeof snapshot>) => ({ ...s, net: money(s.net) });

    return {
      period,
      holderName: account.user.name,
      holderEmail: account.user.email,
      accountName: account.name,
      currency: account.currency,
      generatedAt: new Date().toISOString(),
      income: { total: money(totalIncome), heads: serialize(income, INCOME_HEADS) },
      expenses: { total: money(totalExpense), heads: serialize(expense, EXPENSE_HEADS) },
      wealth: {
        opening: stripNet(opening),
        closing: stripNet(closing),
        lines: lines.map((l) => ({ ...l, amount: money(l.amount) })),
        expectedClosing: money(expected),
        actualClosing: money(closing.net),
        residual: money(residual),
      },
      audit: { errors: count('error'), warnings: count('warning'), infos: count('info'), findings },
      transactions: appendix,
      mapping,
    };
  }
}
