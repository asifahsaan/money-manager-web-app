import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export interface CategoryGroup {
  id: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
  subCategories: { id: number | null; name: string; icon: string | null; color: string | null; amount: number; percentage: number }[];
  transactions: { id: number; date: Date; amount: number; description: string | null; subcategoryName: string | null }[];
}

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: number, accountId: number, startDate: string, endDate: string) {
    await this.verifyOwnership(accountId, userId);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const txs = await this.prisma.transaction.findMany({
      where: {
        accountId,
        type: { in: ['INCOME', 'EXPENSE'] },
        date: { gte: start, lte: end },
        OR: [{ description: { not: 'Opening Balance' } }, { description: null }],
      },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            parentCategoryId: true,
            parent: { select: { id: true, name: true, icon: true, color: true } },
          },
        },
      },
    });

    const totalIncome = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

    const expenseBreakdown = this.buildBreakdown(txs.filter((t) => t.type === 'EXPENSE'), totalExpense);
    const incomeBreakdown = this.buildBreakdown(txs.filter((t) => t.type === 'INCOME'), totalIncome);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, expenseBreakdown, incomeBreakdown };
  }

  private buildBreakdown(
    txs: {
      id: number;
      amount: number | { toNumber(): number };
      date: Date;
      description: string | null;
      categoryId: number | null;
      category: {
        id: number;
        name: string;
        icon: string | null;
        color: string | null;
        parentCategoryId: number | null;
        parent: { id: number; name: string; icon: string | null; color: string | null } | null;
      } | null;
    }[],
    total: number,
  ): CategoryGroup[] {
    // Map keyed by the PARENT category id (or null for uncategorized)
    const parentMap = new Map<number | null, CategoryGroup>();

    for (const tx of txs) {
      const amt = Number(tx.amount);
      const cat = tx.category;
      const parent = cat?.parent ?? null;

      // Determine effective parent
      const parentId = parent ? parent.id : (cat ? cat.id : null);
      const parentName = parent ? parent.name : (cat ? cat.name : 'Uncategorized');
      const parentIcon = parent ? parent.icon : (cat ? cat.icon : null);
      const parentColor = parent ? parent.color : (cat ? cat.color : '#6B7280');

      // Sub-category (only relevant when cat has a parent)
      const subId = parent ? (cat?.id ?? null) : null;
      const subName = parent ? (cat?.name ?? '') : null;
      const subIcon = parent ? (cat?.icon ?? null) : null;
      const subColor = parent ? (cat?.color ?? null) : null;

      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, {
          id: parentId,
          name: parentName,
          icon: parentIcon,
          color: parentColor,
          amount: 0,
          percentage: 0,
          subCategories: [],
          transactions: [],
        });
      }

      const group = parentMap.get(parentId)!;
      group.amount += amt;
      // subcategoryName = the child category name when tx belongs to a sub-category
      const subcategoryName = parent ? (cat?.name ?? null) : null;
      group.transactions.push({ id: tx.id, date: tx.date, amount: amt, description: tx.description, subcategoryName });

      // Accumulate sub-category if tx belongs to a sub-category
      if (subId !== null && subName !== null) {
        const existing = group.subCategories.find((s) => s.id === subId);
        if (existing) {
          existing.amount += amt;
        } else {
          group.subCategories.push({ id: subId, name: subName, icon: subIcon, color: subColor, amount: amt, percentage: 0 });
        }
      }
    }

    return Array.from(parentMap.values())
      .map((g) => ({
        ...g,
        percentage: total > 0 ? (g.amount / total) * 100 : 0,
        subCategories: g.subCategories
          .map((s) => ({ ...s, percentage: g.amount > 0 ? (s.amount / g.amount) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount),
        transactions: g.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getTrend(userId: number, accountId: number, months: number) {
    await this.verifyOwnership(accountId, userId);

    const now = new Date();
    const start = startOfMonth(subMonths(now, months - 1));
    const end = endOfMonth(now);

    const txs = await this.prisma.transaction.findMany({
      where: {
        accountId,
        type: { in: ['INCOME', 'EXPENSE'] },
        date: { gte: start, lte: end },
        OR: [{ description: { not: 'Opening Balance' } }, { description: null }],
      },
      select: { type: true, amount: true, date: true },
    });

    const monthMap = new Map<string, { month: string; income: number; expense: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const key = format(subMonths(now, i), 'yyyy-MM');
      monthMap.set(key, { month: key, income: 0, expense: 0 });
    }

    for (const tx of txs) {
      const key = format(tx.date, 'yyyy-MM');
      if (monthMap.has(key)) {
        const entry = monthMap.get(key)!;
        if (tx.type === 'INCOME') entry.income += Number(tx.amount);
        else entry.expense += Number(tx.amount);
      }
    }

    return Array.from(monthMap.values());
  }

  private async verifyOwnership(accountId: number, userId: number): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
