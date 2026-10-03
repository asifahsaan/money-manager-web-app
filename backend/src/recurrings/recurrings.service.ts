import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { Prisma, Recurring, RecurringFrequency } from '@prisma/client';
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

  /** "Run now": add the next occurrence immediately (even before its date). */
  async execute(id: number, userId: number) {
    const r = await this.findAndVerify(id, userId);
    const result = await this.prisma.$transaction((tx) => this.postOccurrence(tx, r));
    if (!result) throw new ConflictException('This one was just added — refresh and try again');
    return result;
  }

  /**
   * Adds every occurrence that is due (on or before today in Pakistan) for
   * the account's active recurrings, each on its own date — so opening the
   * app after a few days catches up. Safe to call repeatedly: an occurrence
   * is only posted by whoever moves nextOccurrence first.
   */
  async processDue(accountId: number, userId: number) {
    await this.verifyOwnership(accountId, userId);
    const today = this.todayInPakistan();
    const due = await this.prisma.recurring.findMany({
      where: { accountId, isActive: true, nextOccurrence: { lte: today } },
    });

    let created = 0;
    for (const item of due) {
      let r = item;
      // cap the catch-up so a forgotten daily item can't flood the account
      for (let i = 0; i < 400 && r.nextOccurrence <= today; i++) {
        if (r.endDate && r.nextOccurrence > r.endDate) {
          await this.prisma.recurring.update({ where: { id: r.id }, data: { isActive: false } });
          break;
        }
        const res = await this.prisma.$transaction((tx) => this.postOccurrence(tx, r));
        if (!res) break; // another request got there first
        created++;
        r = { ...r, nextOccurrence: res.nextOccurrence };
      }
    }
    return { created };
  }

  /** Creates the transaction for r.nextOccurrence and moves the schedule on. Null if already taken. */
  private async postOccurrence(tx: Prisma.TransactionClient, r: Recurring) {
    const txDate = r.nextOccurrence;
    const nextOccurrence = this.calculateNext(txDate, r.frequency, r.weekdays);

    // Claim this occurrence first; a parallel call sees count 0 and backs off
    const claimed = await tx.recurring.updateMany({
      where: { id: r.id, nextOccurrence: txDate },
      data: { nextOccurrence },
    });
    if (claimed.count === 0) return null;

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
        recurringId: r.id,
      },
    });

    const amount = Number(r.amount);
    if (r.transactionType === 'INCOME' && r.walletId) {
      await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { increment: amount } } });
    } else if (r.transactionType === 'EXPENSE' && r.walletId) {
      await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { decrement: amount } } });
    } else if (r.transactionType === 'TRANSFER') {
      if (r.fromWalletId) await tx.wallet.update({ where: { id: r.fromWalletId }, data: { currentBalance: { decrement: amount } } });
      if (r.toWalletId) await tx.wallet.update({ where: { id: r.toWalletId }, data: { currentBalance: { increment: amount } } });
    }

    return { transaction, nextOccurrence };
  }

  /** Today's date in Pakistan as a UTC-midnight Date, matching how @db.Date columns come back. */
  private todayInPakistan(): Date {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    return new Date(`${ymd}T00:00:00.000Z`);
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
