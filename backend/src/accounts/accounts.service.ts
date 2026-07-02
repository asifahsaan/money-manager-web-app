import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAllByUser(userId: number): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number, userId: number): Promise<Account> {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
    return account;
  }

  async create(userId: number, dto: CreateAccountDto): Promise<Account> {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        currency: dto.currency ?? 'Rs.',
      },
    });

    // Seed default categories and a default Cash wallet
    await Promise.all([
      this.categoriesService.seedDefaultCategories(account.id),
      this.prisma.wallet.create({
        data: {
          accountId: account.id,
          name: 'Cash',
          type: 'CASH',
          icon: 'Wallet',
          color: '#10B981',
          initialBalance: 0,
          currentBalance: 0,
          includedInTotal: true,
          sortOrder: 0,
        },
      }),
    ]);

    return account;
  }

  /**
   * Creates the first default account for a new user.
   * Called automatically during registration.
   */
  async createDefault(userId: number, name: string): Promise<Account> {
    return this.create(userId, { name, currency: 'Rs.' });
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    await this.findOne(id, userId); // validates ownership

    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.findOne(id, userId); // validates ownership

    await this.prisma.account.delete({ where: { id } });
  }
}
