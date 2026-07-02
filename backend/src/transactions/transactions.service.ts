import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { Transaction, TransactionType, Prisma } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

const TRANSACTION_INCLUDE = {
  category: { include: { parent: true } },
  wallet: true,
  fromWallet: true,
  toWallet: true,
} as const;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryTransactionDto): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { accountId: query.accountId };

    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.walletId) {
      where.OR = [
        { walletId: query.walletId },
        { fromWalletId: query.walletId },
        { toWalletId: query.walletId },
      ];
    }
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate) where.date.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }
    if (query.search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { description: { contains: query.search } },
            { memo: { contains: query.search } },
            { category: { name: { contains: query.search } } },
          ],
        },
      ];
    }

    return where;
  }

  async findAll(userId: number, query: QueryTransactionDto) {
    await this.verifyAccountOwnership(query.accountId, userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: TRANSACTION_INCLUDE,
        orderBy: [{ date: 'desc' }, { datetime: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportCsv(userId: number, query: QueryTransactionDto): Promise<string> {
    await this.verifyAccountOwnership(query.accountId, userId);
    const where = this.buildWhere(query);

    const txs = await this.prisma.transaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { datetime: 'desc' }],
    });

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ['Date', 'Time', 'Type', 'Category', 'Wallet', 'Description', 'Memo', 'Amount', 'Fee'];
    const rows = txs.map((t) => {
      const wallet = t.type === 'TRANSFER'
        ? `${t.fromWallet?.name ?? ''} -> ${t.toWallet?.name ?? ''}`
        : t.wallet?.name ?? '';
      return [
        t.date.toISOString().substring(0, 10),
        t.time ?? '',
        t.type,
        t.category?.name ?? '',
        wallet,
        t.description ?? '',
        t.memo ?? '',
        Number(t.amount).toString(),
        Number(t.feeAmount).toString(),
      ].map((v) => escape(String(v))).join(',');
    });

    return [header.map(escape).join(','), ...rows].join('\n');
  }

  async findOne(id: number, userId: number) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: TRANSACTION_INCLUDE,
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.verifyAccountOwnership(tx.accountId, userId);
    return tx;
  }

  async create(userId: number, dto: CreateTransactionDto) {
    await this.verifyAccountOwnership(dto.accountId, userId);
    await this.validateWallets(dto.accountId, dto);

    const { datetime, date } = this.buildDates(dto.date, dto.time);

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          accountId: dto.accountId,
          type: dto.type,
          amount: dto.amount,
          date,
          time: dto.time,
          datetime,
          description: dto.description,
          memo: dto.memo,
          categoryId: dto.categoryId,
          walletId: dto.type !== TransactionType.TRANSFER ? dto.walletId : null,
          fromWalletId: dto.type === TransactionType.TRANSFER ? dto.fromWalletId : null,
          toWalletId: dto.type === TransactionType.TRANSFER ? dto.toWalletId : null,
          feeAmount: dto.feeAmount ?? 0,
        },
        include: TRANSACTION_INCLUDE,
      });

      await this.applyBalance(tx, transaction);
      return transaction;
    });
  }

  async update(id: number, userId: number, dto: UpdateTransactionDto) {
    const existing = await this.findOne(id, userId);

    return this.prisma.$transaction(async (tx) => {
      // Reverse old balance effect
      await this.reverseBalance(tx, existing);

      // Determine effective type and fields
      const type = dto.type ?? existing.type;
      const { datetime, date } = this.buildDates(
        dto.date ?? existing.date.toISOString().substring(0, 10),
        dto.time !== undefined ? dto.time : existing.time ?? undefined,
      );

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          type,
          amount: dto.amount ?? existing.amount,
          date,
          time: dto.time !== undefined ? dto.time : existing.time,
          datetime,
          description: dto.description !== undefined ? dto.description : existing.description,
          memo: dto.memo !== undefined ? dto.memo : existing.memo,
          categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
          walletId: type !== TransactionType.TRANSFER
            ? (dto.walletId !== undefined ? dto.walletId : existing.walletId)
            : null,
          fromWalletId: type === TransactionType.TRANSFER
            ? (dto.fromWalletId !== undefined ? dto.fromWalletId : existing.fromWalletId)
            : null,
          toWalletId: type === TransactionType.TRANSFER
            ? (dto.toWalletId !== undefined ? dto.toWalletId : existing.toWalletId)
            : null,
          feeAmount: dto.feeAmount !== undefined ? dto.feeAmount : existing.feeAmount,
        },
        include: TRANSACTION_INCLUDE,
      });

      // Apply new balance effect
      await this.applyBalance(tx, updated);
      return updated;
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    const existing = await this.findOne(id, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.reverseBalance(tx, existing);
      await tx.transaction.delete({ where: { id } });
    });
  }

  // ─── Balance helpers ───────────────────────────────────────────────────────

  private async applyBalance(tx: PrismaTx, t: Transaction): Promise<void> {
    const amount = Number(t.amount);
    const fee = Number(t.feeAmount);

    if (t.type === TransactionType.INCOME && t.walletId) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { currentBalance: { increment: amount } },
      });
    } else if (t.type === TransactionType.EXPENSE && t.walletId) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { currentBalance: { decrement: amount } },
      });
    } else if (t.type === TransactionType.TRANSFER) {
      if (t.fromWalletId) {
        await tx.wallet.update({
          where: { id: t.fromWalletId },
          data: { currentBalance: { decrement: amount + fee } },
        });
      }
      if (t.toWalletId) {
        await tx.wallet.update({
          where: { id: t.toWalletId },
          data: { currentBalance: { increment: amount } },
        });
      }
    }
  }

  private async reverseBalance(tx: PrismaTx, t: Transaction): Promise<void> {
    const amount = Number(t.amount);
    const fee = Number(t.feeAmount);

    if (t.type === TransactionType.INCOME && t.walletId) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { currentBalance: { decrement: amount } },
      });
    } else if (t.type === TransactionType.EXPENSE && t.walletId) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { currentBalance: { increment: amount } },
      });
    } else if (t.type === TransactionType.TRANSFER) {
      if (t.fromWalletId) {
        await tx.wallet.update({
          where: { id: t.fromWalletId },
          data: { currentBalance: { increment: amount + fee } },
        });
      }
      if (t.toWalletId) {
        await tx.wallet.update({
          where: { id: t.toWalletId },
          data: { currentBalance: { decrement: amount } },
        });
      }
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  private buildDates(dateStr: string, time?: string): { datetime: Date; date: Date } {
    // Use UTC midnight for the DATE field to avoid timezone-induced date shifts
    // (e.g. PKT UTC+5 would shift "2026-07-01T00:00:00" → June 30 in UTC)
    const datetimeStr = time ? `${dateStr}T${time}:00` : `${dateStr}T00:00:00`;
    return {
      datetime: new Date(datetimeStr + 'Z'),
      date: new Date(dateStr + 'T00:00:00.000Z'),
    };
  }

  private async validateWallets(
    accountId: number,
    dto: CreateTransactionDto | UpdateTransactionDto,
  ): Promise<void> {
    const walletIds = [
      (dto as CreateTransactionDto).walletId,
      (dto as CreateTransactionDto).fromWalletId,
      (dto as CreateTransactionDto).toWalletId,
    ].filter((id): id is number => id !== undefined && id !== null);

    for (const wid of walletIds) {
      const wallet = await this.prisma.wallet.findUnique({ where: { id: wid } });
      if (!wallet || wallet.accountId !== accountId) {
        throw new BadRequestException(`Wallet ${wid} not found in this account`);
      }
    }
  }

  private async verifyAccountOwnership(accountId: number, userId: number): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
