import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtPaymentDto } from './dto/debt-payment.dto';
import { DebtStatus } from '@prisma/client';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, userId: number) {
    await this.verifyOwnership(accountId, userId);
    return this.prisma.debt.findMany({
      where: { accountId },
      include: { entries: { orderBy: { date: 'desc' }, take: 5 } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const debt = await this.findAndVerify(id, userId);
    return this.prisma.debt.findUnique({
      where: { id: debt.id },
      include: { entries: { orderBy: { date: 'desc' } } },
    });
  }

  async create(userId: number, dto: CreateDebtDto) {
    await this.verifyOwnership(dto.accountId, userId);
    const txDate = new Date(dto.date + 'T00:00:00');

    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          accountId: dto.accountId,
          type: dto.type,
          personName: dto.personName,
          description: dto.description ?? null,
          totalAmount: dto.totalAmount,
          settledAmount: 0,
          remainingAmount: dto.totalAmount,
          walletId: dto.walletId ?? null,
          color: dto.color ?? null,
          date: txDate,
        },
      });

      // If a wallet is linked, immediately move money:
      // RECEIVABLE (you lent money) → deduct from wallet (EXPENSE)
      // PAYABLE (you borrowed money) → add to wallet (INCOME)
      if (dto.walletId) {
        const txType = dto.type === 'RECEIVABLE' ? 'EXPENSE' : 'INCOME';
        const description =
          dto.type === 'RECEIVABLE'
            ? `Lent to ${dto.personName}${dto.description ? ` (${dto.description})` : ''}`
            : `Borrowed from ${dto.personName}${dto.description ? ` (${dto.description})` : ''}`;

        await tx.transaction.create({
          data: {
            accountId: dto.accountId,
            walletId: dto.walletId,
            type: txType,
            amount: dto.totalAmount,
            description,
            date: txDate,
            datetime: txDate,
            debtId: debt.id,
          },
        });

        if (txType === 'EXPENSE') {
          await tx.wallet.update({
            where: { id: dto.walletId },
            data: { currentBalance: { decrement: dto.totalAmount } },
          });
        } else {
          await tx.wallet.update({
            where: { id: dto.walletId },
            data: { currentBalance: { increment: dto.totalAmount } },
          });
        }
      }

      return debt;
    });
  }

  async update(id: number, userId: number, dto: UpdateDebtDto) {
    const debt = await this.findAndVerify(id, userId);

    // Recalculate remaining if totalAmount changes
    let totalAmount: number | undefined;
    let remainingAmount: number | undefined;
    let status: DebtStatus | undefined;
    if (dto.totalAmount !== undefined) {
      totalAmount = dto.totalAmount;
      const settled = Number(debt.settledAmount);
      remainingAmount = Math.max(0, totalAmount - settled);
      status = remainingAmount <= 0 ? DebtStatus.CLOSED : settled > 0 ? DebtStatus.PARTIAL : DebtStatus.OPEN;
    }

    return this.prisma.debt.update({
      where: { id: debt.id },
      data: {
        ...(dto.personName !== undefined && { personName: dto.personName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(totalAmount !== undefined && { totalAmount, remainingAmount, status }),
        ...(dto.walletId !== undefined && { walletId: dto.walletId }),
      },
    });
  }

  async pay(id: number, userId: number, dto: DebtPaymentDto) {
    const debt = await this.findAndVerify(id, userId);
    if (debt.status === 'CLOSED') throw new BadRequestException('Debt is already closed');
    const amount = dto.amount;
    const remaining = Number(debt.remainingAmount);
    if (amount > remaining) throw new BadRequestException(`Amount exceeds remaining: ${remaining}`);

    return this.prisma.$transaction(async (tx) => {
      // PAYABLE: we pay money → EXPENSE; RECEIVABLE: we collect → INCOME
      const txType = debt.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME';

      const txDate = new Date(dto.date + 'T00:00:00');
      const transaction = await tx.transaction.create({
        data: {
          accountId: debt.accountId,
          walletId: dto.walletId,
          type: txType,
          amount,
          description: `${debt.type === 'PAYABLE' ? 'Debt payment' : 'Debt collection'}: ${debt.personName}`,
          date: txDate,
          datetime: txDate,
          debtId: id,
        },
      });

      if (txType === 'EXPENSE') {
        await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { decrement: amount } } });
      } else {
        await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { increment: amount } } });
      }

      const newSettled = Number(debt.settledAmount) + amount;
      const newRemaining = remaining - amount;
      const newStatus = newRemaining <= 0 ? 'CLOSED' : newSettled > 0 ? 'PARTIAL' : 'OPEN';

      await tx.debt.update({
        where: { id: debt.id },
        data: { settledAmount: newSettled, remainingAmount: newRemaining, status: newStatus },
      });

      const entryType = debt.type === 'PAYABLE' ? 'PAYMENT' : 'COLLECTION';
      await tx.debtEntry.create({
        data: {
          debtId: id,
          type: entryType,
          amount,
          walletId: dto.walletId,
          transactionId: transaction.id,
          date: new Date(dto.date),
          note: dto.note ?? null,
        },
      });

      return tx.debt.findUnique({ where: { id: debt.id }, include: { entries: { orderBy: { date: 'desc' }, take: 5 } } });
    });
  }

  async delete(id: number, userId: number) {
    const debt = await this.findAndVerify(id, userId);
    await this.prisma.debt.delete({ where: { id: debt.id } });
  }

  private async findAndVerify(id: number, userId: number) {
    const debt = await this.prisma.debt.findUnique({ where: { id } });
    if (!debt) throw new NotFoundException('Debt not found');
    await this.verifyOwnership(debt.accountId, userId);
    return debt;
  }

  private async verifyOwnership(accountId: number, userId: number) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
