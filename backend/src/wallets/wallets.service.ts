import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet, WalletType, TransactionType } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByAccount(accountId: number, userId: number): Promise<Wallet[]> {
    await this.verifyAccountOwnership(accountId, userId);
    return this.prisma.wallet.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: number, userId: number): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    await this.verifyAccountOwnership(wallet.accountId, userId);
    return wallet;
  }

  async create(userId: number, dto: CreateWalletDto): Promise<Wallet> {
    await this.verifyAccountOwnership(dto.accountId, userId);
    const initial = Number(dto.initialBalance ?? 0);

    // If initial balance > 0, create wallet + opening-balance income transaction atomically
    if (initial > 0) {
      return this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.create({
          data: {
            accountId: dto.accountId,
            name: dto.name,
            type: dto.type ?? WalletType.CASH,
            icon: dto.icon,
            color: dto.color,
            initialBalance: initial,
            currentBalance: 0,
            includedInTotal: dto.includedInTotal ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });

        const now = new Date();
        // UTC midnight, like every other DATE column (see transactions buildDates)
        const dateOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        await tx.transaction.create({
          data: {
            accountId: dto.accountId,
            type: TransactionType.INCOME,
            amount: initial,
            date: dateOnly,
            datetime: now,
            description: 'Opening Balance',
            isOpeningBalance: true,
            walletId: wallet.id,
          },
        });

        return tx.wallet.update({
          where: { id: wallet.id },
          data: { currentBalance: { increment: initial } },
        });
      });
    }

    return this.prisma.wallet.create({
      data: {
        accountId: dto.accountId,
        name: dto.name,
        type: dto.type ?? WalletType.CASH,
        icon: dto.icon,
        color: dto.color,
        initialBalance: 0,
        currentBalance: 0,
        includedInTotal: dto.includedInTotal ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async createDefault(accountId: number): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: {
        accountId,
        name: 'Cash',
        type: WalletType.CASH,
        icon: 'Wallet',
        color: '#10B981',
        initialBalance: 0,
        currentBalance: 0,
        includedInTotal: true,
        sortOrder: 0,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(id, userId);
    if (dto.initialBalance === undefined || Number(dto.initialBalance) === Number(wallet.initialBalance)) {
      return this.prisma.wallet.update({ where: { id }, data: dto });
    }

    // The opening balance is a real transaction (balances are rebuilt from
    // transactions in statements and the tax report), so changing it must
    // move that transaction too — not just the stored balance.
    const newInitial = Number(dto.initialBalance);
    const delta = newInitial - Number(wallet.initialBalance);
    return this.prisma.$transaction(async (tx) => {
      const opening = await tx.transaction.findFirst({ where: { walletId: id, isOpeningBalance: true } });
      if (opening) {
        if (newInitial > 0) {
          await tx.transaction.update({ where: { id: opening.id }, data: { amount: newInitial } });
        } else {
          await tx.transaction.delete({ where: { id: opening.id } });
        }
      } else if (newInitial > 0) {
        // Older wallets may have none: create it on the day the wallet was opened.
        // Its full amount is new to the ledger, while the stored balance only
        // moves by the delta — this also heals wallets edited before this fix.
        const c = wallet.createdAt;
        const day = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()));
        await tx.transaction.create({
          data: {
            accountId: wallet.accountId,
            type: TransactionType.INCOME,
            amount: newInitial,
            date: day,
            datetime: c,
            description: 'Opening Balance',
            isOpeningBalance: true,
            walletId: id,
          },
        });
      }
      return tx.wallet.update({
        where: { id },
        data: { ...dto, currentBalance: { increment: delta } },
      });
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.findOne(id, userId);
    const txCount = await this.prisma.transaction.count({
      where: {
        OR: [
          { walletId: id },
          { fromWalletId: id },
          { toWalletId: id },
        ],
      },
    });
    if (txCount > 0) {
      throw new BadRequestException(
        'Cannot delete a wallet that has transactions. Archive it instead.',
      );
    }
    await this.prisma.wallet.delete({ where: { id } });
  }

  private async verifyAccountOwnership(accountId: number, userId: number): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
