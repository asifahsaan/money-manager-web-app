import { ForbiddenException, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { addDays, differenceInCalendarDays, endOfMonth } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { nextOccurrenceAfter, todayInPakistan } from '../recurrings/schedule';

// How far back "normal day-to-day spending" is measured for the forecast,
// and the shortest history it averages over (a new wallet)
const HISTORY_DAYS = 60;
const MIN_DAYS = 14;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Where each wallet is heading by the end of the month: today's balance,
   * plus/minus the recurring items still to come (on their dates), minus the
   * wallet's usual day-to-day spending. Walked day by day so we can say when
   * a wallet would dip below zero.
   */
  async forecast(accountId: number, userId: number) {
    await this.verifyOwnership(accountId, userId);
    const today = todayInPakistan();
    // endOfMonth works in local time — rebuild it as a UTC midnight
    const monthEnd = new Date(`${ymd(endOfMonth(new Date(today.getUTCFullYear(), today.getUTCMonth(), 1)))}T00:00:00.000Z`);
    const historyFrom = addDays(today, -HISTORY_DAYS);

    const [wallets, recurrings, history, firstDates] = await Promise.all([
      this.prisma.wallet.findMany({ where: { accountId, archived: false }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.recurring.findMany({ where: { accountId, isActive: true, nextOccurrence: { lte: monthEnd } } }),
      // Day-to-day spending: expenses not made by a recurring item (counted on their dates
      // instead), not money lent out and not goal savings
      this.prisma.transaction.findMany({
        where: {
          accountId,
          type: TransactionType.EXPENSE,
          recurringId: null,
          isOpeningBalance: false,
          goalId: null,
          debtId: null,
          date: { gte: historyFrom, lt: today },
        },
        select: { walletId: true, date: true, amount: true },
      }),
      // When each wallet's history starts, so a new wallet isn't averaged over 60 empty days
      this.prisma.transaction.groupBy({ by: ['walletId'], where: { accountId }, _min: { date: true } }),
    ]);

    // Per wallet: totals per day of the window
    const dayTotals = new Map<number, Map<string, number>>();
    for (const t of history) {
      if (!t.walletId) continue;
      const m = dayTotals.get(t.walletId) ?? new Map<string, number>();
      m.set(ymd(t.date), (m.get(ymd(t.date)) ?? 0) + Number(t.amount));
      dayTotals.set(t.walletId, m);
    }
    /** Typical spending per day: daily totals over the window, with unusually big days capped. */
    const typicalDaily = (walletId: number): number => {
      const first = firstDates.find((f) => f.walletId === walletId)?._min.date;
      if (!first) return 0;
      const window = Math.max(MIN_DAYS, Math.min(HISTORY_DAYS, differenceInCalendarDays(today, first)));
      const byDay = dayTotals.get(walletId) ?? new Map<string, number>();
      const totals: number[] = [];
      for (let i = 1; i <= window; i++) totals.push(byDay.get(ymd(addDays(today, -i))) ?? 0);
      // a rent or a phone bought once shouldn't look like daily spending: cap days at the 90th percentile
      const cap = [...totals].sort((a, b) => a - b)[Math.floor(totals.length * 0.9)] ?? 0;
      return totals.reduce((sum, v) => sum + Math.min(v, cap), 0) / totals.length;
    };

    // Scheduled money per wallet per day, from today (if not yet added) to month end
    const scheduled = new Map<number, Map<string, number>>();
    const add = (walletId: number | null, day: Date, amount: number) => {
      if (!walletId) return;
      const byDay = scheduled.get(walletId) ?? new Map<string, number>();
      byDay.set(ymd(day), (byDay.get(ymd(day)) ?? 0) + amount);
      scheduled.set(walletId, byDay);
    };
    for (const r of recurrings) {
      const amount = Number(r.amount);
      for (let d = r.nextOccurrence, i = 0; d <= monthEnd && i < 400; d = nextOccurrenceAfter(d, r.frequency, r.weekdays), i++) {
        if (d < today) continue; // overdue ones are added as soon as the app opens
        if (r.endDate && d > r.endDate) break;
        if (r.transactionType === 'INCOME') add(r.walletId, d, amount);
        else if (r.transactionType === 'EXPENSE') add(r.walletId, d, -amount);
        else {
          add(r.fromWalletId, d, -amount);
          add(r.toWalletId, d, amount);
        }
      }
    }

    const daysLeft = differenceInCalendarDays(monthEnd, today); // full days after today
    const result = wallets.map((w) => {
      const dailySpend = typicalDaily(w.id);
      const byDay = scheduled.get(w.id) ?? new Map<string, number>();

      let balance = Number(w.currentBalance);
      let lowest = balance;
      let lowestDate = ymd(today);
      let negativeOn: string | null = balance < 0 ? ymd(today) : null;
      let recurringIn = 0;
      let recurringOut = 0;
      for (let d = today, i = 0; d <= monthEnd; d = addDays(d, 1), i++) {
        const flow = byDay.get(ymd(d)) ?? 0;
        if (flow > 0) recurringIn += flow;
        else recurringOut -= flow;
        // today's own spending has partly happened already — start the average tomorrow
        balance += flow - (i === 0 ? 0 : dailySpend);
        if (balance < lowest) {
          lowest = balance;
          lowestDate = ymd(d);
        }
        if (balance < 0 && !negativeOn) negativeOn = ymd(d);
      }
      return {
        walletId: w.id,
        name: w.name,
        includedInTotal: w.includedInTotal,
        current: round(Number(w.currentBalance)),
        recurringIn: round(recurringIn),
        recurringOut: round(recurringOut),
        dailySpend: round(dailySpend),
        expectedSpending: round(dailySpend * daysLeft),
        projected: round(balance),
        lowest: round(lowest),
        lowestDate,
        negativeOn,
      };
    });

    // A wallet that dips below zero: suggest topping it up from the wallet with the most to spare
    const tips = result
      .filter((w) => w.negativeOn)
      .map((w) => {
        const need = Math.ceil(-w.lowest / 500) * 500 || 500;
        const donor = result
          .filter((o) => o.walletId !== w.walletId && !o.negativeOn && o.lowest - need > 0)
          .sort((a, b) => b.lowest - a.lowest)[0];
        return { walletId: w.walletId, need, fromWalletId: donor?.walletId ?? null, fromName: donor?.name ?? null };
      });

    const counted = result.filter((w) => w.includedInTotal);
    return {
      asOf: ymd(today),
      monthEnd: ymd(monthEnd),
      daysLeft,
      historyDays: HISTORY_DAYS,
      wallets: result,
      total: {
        current: round(sum(counted.map((w) => w.current))),
        projected: round(sum(counted.map((w) => w.projected))),
        recurringIn: round(sum(counted.map((w) => w.recurringIn))),
        recurringOut: round(sum(counted.map((w) => w.recurringOut))),
        expectedSpending: round(sum(counted.map((w) => w.expectedSpending))),
      },
      tips,
    };
  }

  /**
   * What the user usually enters, for filling the form: past transactions whose
   * note matches `q` (or, with no query, the most frequent recent ones), grouped
   * by note + category + wallet, most used first.
   */
  async suggestions(accountId: number, userId: number, q: string, type?: TransactionType) {
    await this.verifyOwnership(accountId, userId);
    const query = q.trim();
    const since = addDays(todayInPakistan(), query ? -400 : -90);
    const rows = await this.prisma.transaction.findMany({
      where: {
        accountId,
        isOpeningBalance: false,
        type: type ?? { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        date: { gte: since },
        description: query ? { contains: query, mode: 'insensitive' } : { not: null },
      },
      select: {
        description: true,
        type: true,
        amount: true,
        date: true,
        categoryId: true,
        walletId: true,
        category: { select: { name: true, icon: true, color: true, parent: { select: { name: true } } } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 800,
    });

    type Group = {
      description: string;
      type: TransactionType;
      categoryId: number | null;
      categoryLabel: string | null;
      categoryIcon: string | null;
      categoryColor: string | null;
      walletId: number | null;
      walletName: string | null;
      amount: number; // most recent
      count: number;
      lastDate: string;
    };
    const groups = new Map<string, Group>();
    for (const t of rows) {
      const desc = t.description?.trim();
      if (!desc) continue;
      const key = `${desc.toLowerCase()}|${t.type}|${t.categoryId ?? ''}|${t.walletId ?? ''}`;
      const g = groups.get(key);
      if (g) {
        g.count++;
        continue;
      }
      groups.set(key, {
        description: desc,
        type: t.type,
        categoryId: t.categoryId,
        categoryLabel: t.category ? (t.category.parent ? `${t.category.parent.name} › ${t.category.name}` : t.category.name) : null,
        categoryIcon: t.category?.icon ?? null,
        categoryColor: t.category?.color ?? null,
        walletId: t.walletId,
        walletName: t.wallet?.name ?? null,
        amount: Number(t.amount),
        count: 1,
        lastDate: ymd(t.date),
      });
    }

    const lower = query.toLowerCase();
    return [...groups.values()]
      .sort(
        (a, b) =>
          // notes that start with what was typed first, then the most used, then the most recent
          Number(b.description.toLowerCase().startsWith(lower)) - Number(a.description.toLowerCase().startsWith(lower)) ||
          b.count - a.count ||
          b.lastDate.localeCompare(a.lastDate),
      )
      .slice(0, 6);
  }

  private async verifyOwnership(accountId: number, userId: number) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== userId) throw new ForbiddenException('Access denied');
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (n: number) => Math.round(n);
