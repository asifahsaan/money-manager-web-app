import { BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

// Every wallet/category id arriving in a request body must belong to the same
// account as the record being changed — otherwise a user could move money in,
// or read category names from, another user's account by guessing ids.

export async function assertWalletsInAccount(
  db: Db,
  accountId: number,
  ...walletIds: (number | null | undefined)[]
): Promise<void> {
  const ids = [...new Set(walletIds.filter((id): id is number => typeof id === 'number'))];
  if (!ids.length) return;
  const found = await db.wallet.count({ where: { id: { in: ids }, accountId } });
  if (found !== ids.length) throw new BadRequestException('Wallet not found in this account');
}

export async function assertCategoriesInAccount(
  db: Db,
  accountId: number,
  ...categoryIds: (number | null | undefined)[]
): Promise<void> {
  const ids = [...new Set(categoryIds.filter((id): id is number => typeof id === 'number'))];
  if (!ids.length) return;
  const found = await db.category.count({ where: { id: { in: ids }, accountId } });
  if (found !== ids.length) throw new BadRequestException('Category not found in this account');
}
