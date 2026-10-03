import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { RecurringFrequency } from '@prisma/client';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { assertWalletsInAccount, assertCategoriesInAccount } from '../common/utils/ownership';

@Injectable()
export class RecurringsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, userId: number) {
    await this.verifyOwnership(accountId, userId);
    return this.prisma.recurring.findMany({
      where: { accountId },
      include: { category: true },
      orderBy: { nextOccurrence: 'asc' },
    });
  }

  async create(userId: number, dto: CreateRecurringDto) {
    await this.verifyOwnership(dto.accountId, userId);
    await assertWalletsInAccount(this.prisma, dto.accountId, dto.walletId, dto.fromWalletId, dto.toWalletId);
    await assertCategoriesInAccount(this.prisma, dto.accountId, dto.categoryId);
    const startDate = new Date(dto.startDate);
    const weekdays = this.cleanWeekdays(dto.frequency, dto.weekdays);
    return this.prisma.recurring.create({
      data: {
        accountId: dto.accountId,
        transactionType: dto.transactionType,
        amount: dto.amount,
        description: dto.description ?? null,
        memo: dto.memo ?? null,
        categoryId: dto.categoryId ?? null,
        walletId: dto.walletId ?? null,
        fromWalletId: dto.fromWalletId ?? null,
        toWalletId: dto.toWalletId ?? null,
        frequency: dto.frequency,
        weekdays,
        startDate,
        // e.g. started on a Sunday but repeats Mon/Tue/Fri → first due Monday
        nextOccurrence: this.alignToWeekdays(startDate, weekdays),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: { category: true },
    });
  }

  async update(id: number, userId: number, dto: UpdateRecurringDto) {
    const r = await this.findAndVerify(id, userId);
    await assertCategoriesInAccount(this.prisma, r.accountId, dto.categoryId ?? undefined);
    await assertWalletsInAccount(this.prisma, r.accountId, dto.walletId ?? undefined, dto.fromWalletId ?? undefined, dto.toWalletId ?? undefined);

    const frequency = dto.frequency ?? r.frequency;
    const scheduleChanged = dto.frequency !== undefined || dto.weekdays !== undefined;
    const weekdays = scheduleChanged ? this.cleanWeekdays(frequency, dto.weekdays ?? r.weekdays) : r.weekdays;
    const base = dto.nextOccurrence ? new Date(dto.nextOccurrence) : r.nextOccurrence;
    const nextOccurrence = scheduleChanged || dto.nextOccurrence ? this.alignToWeekdays(base, weekdays) : undefined;

    return this.prisma.recurring.update({
      where: { id: r.id },
      data: {
        ...(scheduleChanged && { weekdays }),
        ...(nextOccurrence && { nextOccurrence }),
        ...(dto.walletId !== undefined && { walletId: dto.walletId }),
        ...(dto.fromWalletId !== undefined && { fromWalletId: dto.fromWalletId }),
        ...(dto.toWalletId !== undefined && { toWalletId: dto.toWalletId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { category: true },
    });
  }

  async execute(id: number, userId: number) {
    const r = await this.findAndVerify(id, userId);

    return this.prisma.$transaction(async (tx) => {
      const txDate = r.nextOccurrence;

      const transaction = await tx.transaction.create({
        data: {
          accountId: r.accountId,
          type: r.transactionType,
          amount: r.amount,
          description: r.description ?? `Recurring: ${r.frequency}`,
          date: txDate,
          datetime: txDate,
          categoryId: r.categoryId ?? null,
          walletId: r.walletId ?? null,
          fromWalletId: r.fromWalletId ?? null,
          toWalletId: r.toWalletId ?? null,
        },
      });

      // Update wallet balances
      if (r.transactionType === 'INCOME' && r.walletId) {
        await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { increment: Number(r.amount) } } });
      } else if (r.transactionType === 'EXPENSE' && r.walletId) {
        await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { decrement: Number(r.amount) } } });
      } else if (r.transactionType === 'TRANSFER') {
        if (r.fromWalletId) {
          await tx.wallet.update({ where: { id: r.fromWalletId }, data: { currentBalance: { decrement: Number(r.amount) } } });
        }
        if (r.toWalletId) {
          await tx.wallet.update({ where: { id: r.toWalletId }, data: { currentBalance: { increment: Number(r.amount) } } });
        }
      }

      const nextOccurrence = this.calculateNext(r.nextOccurrence, r.frequency, r.weekdays);
      await tx.recurring.update({ where: { id: r.id }, data: { nextOccurrence } });

      return { transaction, nextOccurrence };
    });
  }

  async delete(id: number, userId: number) {
    const r = await this.findAndVerify(id, userId);
    await this.prisma.recurring.delete({ where: { id: r.id } });
  }

  /** Sorted, de-duplicated weekdays; only kept for WEEKLY. */
  private cleanWeekdays(frequency: RecurringFrequency, weekdays?: number[]): number[] {
    if (frequency !== 'WEEKLY' || !weekdays?.length) return [];
    return [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  }

  /** The first date on or after `from` that falls on one of `weekdays` (dates are UTC midnights). */
  private alignToWeekdays(from: Date, weekdays: number[]): Date {
    if (!weekdays.length) return from;
    let d = from;
    for (let i = 0; i < 7 && !weekdays.includes(d.getUTCDay()); i++) d = addDays(d, 1);
    return d;
  }

  private calculateNext(from: Date, frequency: RecurringFrequency, weekdays: number[] = []): Date {
    if (frequency === 'WEEKLY' && weekdays.length) return this.alignToWeekdays(addDays(from, 1), weekdays);
    switch (frequency) {
      case 'DAILY': return addDays(from, 1);
      case 'WEEKLY': return addWeeks(from, 1);
      case 'MONTHLY': return addMonths(from, 1);
      case 'YEARLY': return addYears(from, 1);
      default: return addMonths(from, 1);
    }
  }

  private async findAndVerify(id: number, userId: number) {
    const r = await this.prisma.recurring.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recurring not found');
    await this.verifyOwnership(r.accountId, userId);
    return r;
  }

  private async verifyOwnership(accountId: number, userId: number) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
