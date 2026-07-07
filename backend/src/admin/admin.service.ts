import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalTransactions,
      txThisMonth,
      totalVolumeRaw,
      volumeThisMonthRaw,
      totalWallets,
      totalAccounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { date: { gte: monthStart } } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'EXPENSE' } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'EXPENSE', date: { gte: monthStart } } }),
      this.prisma.wallet.count(),
      this.prisma.account.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      userGrowthPct: lastMonthEnd > lastMonthStart && newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : null,
      totalTransactions,
      txThisMonth,
      totalExpenseVolume: Number(totalVolumeRaw._sum.amount ?? 0),
      expenseVolumeThisMonth: Number(volumeThisMonthRaw._sum.amount ?? 0),
      totalWallets,
      totalAccounts,
    };
  }

  async getUserGrowth(months = 12) {
    const now = new Date();
    const result: { month: string; users: number; cumulative: number }[] = [];
    let cumulative = 0;

    // baseline: users created before the window
    const windowStart = startOfMonth(subMonths(now, months - 1));
    const baseline = await this.prisma.user.count({ where: { createdAt: { lt: windowStart } } });
    cumulative = baseline;

    for (let i = months - 1; i >= 0; i--) {
      const start = startOfMonth(subMonths(now, i));
      const end = endOfMonth(subMonths(now, i));
      const count = await this.prisma.user.count({ where: { createdAt: { gte: start, lte: end } } });
      cumulative += count;
      result.push({ month: format(start, 'yyyy-MM'), users: count, cumulative });
    }
    return result;
  }

  async getTransactionTrend(months = 6) {
    const now = new Date();
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = startOfMonth(subMonths(now, i));
      const end = endOfMonth(subMonths(now, i));
      const [income, expense, count] = await Promise.all([
        this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'INCOME', date: { gte: start, lte: end } } }),
        this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'EXPENSE', date: { gte: start, lte: end } } }),
        this.prisma.transaction.count({ where: { date: { gte: start, lte: end } } }),
      ]);
      results.push({
        month: format(start, 'yyyy-MM'),
        income: Number(income._sum.amount ?? 0),
        expense: Number(expense._sum.amount ?? 0),
        count,
      });
    }
    return results;
  }

  async getTopCategories(limit = 10) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { type: 'EXPENSE', categoryId: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const cats = await this.prisma.category.findMany({ where: { id: { in: rows.map((r) => r.categoryId!).filter(Boolean) } } });
    const catMap = new Map(cats.map((c) => [c.id, c]));

    return rows.map((r) => ({
      category: catMap.get(r.categoryId!) ?? null,
      totalAmount: Number(r._sum.amount ?? 0),
      txCount: r._count.id,
    }));
  }

  async getUsers(search?: string, page = 1, limit = 20) {
    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          createdAt: true, defaultCurrency: true,
          _count: { select: { accounts: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich with transaction count per user
    const enriched = await Promise.all(users.map(async (u) => {
      const accounts = await this.prisma.account.findMany({ where: { userId: u.id }, select: { id: true } });
      const accountIds = accounts.map((a) => a.id);
      const txCount = accountIds.length > 0
        ? await this.prisma.transaction.count({ where: { accountId: { in: accountIds } } })
        : 0;
      const lastTx = accountIds.length > 0
        ? await this.prisma.transaction.findFirst({ where: { accountId: { in: accountIds } }, orderBy: { createdAt: 'desc' }, select: { date: true } })
        : null;
      return { ...u, txCount, lastActivity: lastTx?.date ?? null };
    }));

    return { users: enriched, total, page, pages: Math.ceil(total / limit) };
  }

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { accounts: { include: { wallets: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const accountIds = user.accounts.map((a) => a.id);
    const [txCount, totalExpense, totalIncome] = await Promise.all([
      this.prisma.transaction.count({ where: { accountId: { in: accountIds } } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { accountId: { in: accountIds }, type: 'EXPENSE' } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { accountId: { in: accountIds }, type: 'INCOME' } }),
    ]);

    return {
      ...user,
      passwordHash: undefined,
      txCount,
      totalExpense: Number(totalExpense._sum.amount ?? 0),
      totalIncome: Number(totalIncome._sum.amount ?? 0),
    };
  }

  async updateUser(id: number, data: { role?: UserRole; isActive?: boolean; name?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: number) {
    await this.prisma.user.delete({ where: { id } });
  }
}
