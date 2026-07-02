import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_DEFAULT_CATEGORIES } from './seeds/default-categories.seed';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultCategories(accountId: number): Promise<void> {
    const data = ALL_DEFAULT_CATEGORIES.map((cat) => ({ ...cat, accountId }));
    await this.prisma.category.createMany({ data });
  }

  async findAll(accountId: number, userId: number, type?: CategoryType) {
    await this.verifyAccountOwnership(accountId, userId);
    const where: { accountId: number; type?: CategoryType; parentCategoryId: null } = {
      accountId,
      parentCategoryId: null,
    };
    if (type) where.type = type;

    return this.prisma.category.findMany({
      where,
      include: {
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(userId: number, dto: CreateCategoryDto): Promise<Category> {
    await this.verifyAccountOwnership(dto.accountId, userId);

    if (dto.parentCategoryId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentCategoryId },
      });
      if (!parent || parent.accountId !== dto.accountId) {
        throw new BadRequestException('Parent category not found');
      }
      if (parent.parentCategoryId !== null) {
        throw new BadRequestException('Subcategories cannot have nested subcategories');
      }
    }

    return this.prisma.category.create({
      data: {
        accountId: dto.accountId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon,
        color: dto.color,
        parentCategoryId: dto.parentCategoryId ?? null,
        description: dto.description,
        isDefault: false,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateCategoryDto): Promise<Category> {
    await this.findCategoryAndVerify(id, userId);
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentCategoryId !== undefined && {
          parentCategoryId: dto.parentCategoryId,
        }),
      },
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    const category = await this.findCategoryAndVerify(id, userId);
    if (category.isDefault) {
      throw new BadRequestException('Cannot delete default categories');
    }
    await this.prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    // Delete children
    await this.prisma.category.deleteMany({ where: { parentCategoryId: id } });
    await this.prisma.category.delete({ where: { id } });
  }

  private async findCategoryAndVerify(id: number, userId: number): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.verifyAccountOwnership(category.accountId, userId);
    return category;
  }

  private async verifyAccountOwnership(accountId: number, userId: number): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
