import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, userId: number, startDate?: string, endDate?: string) {
    await this.verifyOwnership(accountId, userId);

    const budgets = await this.prisma.budget.findMany({
      where: { accountId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      budgets.map(async (b) => {
        const start = startDate ? new Date(startDate) : b.startDate;
        const end = endDate ? new Date(endDate) : b.endDate;

        const agg = await this.prisma.transaction.aggregate({
          where: {
            accountId,
            categoryId: b.categoryId,
            type: 'EXPENSE',
            goalId: null,
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        const spent = Number(agg._sum.amount ?? 0);
        const budget = Number(b.amount);
        return {
          ...b,
          spent,
          remaining: Math.max(0, budget - spent),
          percentage: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
        };
      }),
    );
  }

  async create(userId: number, dto: CreateBudgetDto) {
    await this.verifyOwnership(dto.accountId, userId);
    return this.prisma.budget.create({
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        periodType: dto.periodType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: { category: true },
    });
  }

  async update(id: number, userId: number, dto: UpdateBudgetDto) {
    const b = await this.findAndVerify(id, userId);
    return this.prisma.budget.update({
      where: { id: b.id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
      include: { category: true },
    });
  }

  async delete(id: number, userId: number) {
    const b = await this.findAndVerify(id, userId);
    await this.prisma.budget.delete({ where: { id: b.id } });
  }

  private async findAndVerify(id: number, userId: number) {
    const b = await this.prisma.budget.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Budget not found');
    await this.verifyOwnership(b.accountId, userId);
    return b;
  }

  private async verifyOwnership(accountId: number, userId: number) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
