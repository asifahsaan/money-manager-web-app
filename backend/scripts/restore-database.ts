import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/restore-database.ts <path-to-backup.json>');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`Restoring backup from ${data.exportedAt}...`);

  // Insert in dependency order: parents before children
  await prisma.user.createMany({ data: data.users, skipDuplicates: true });
  await prisma.account.createMany({ data: data.accounts, skipDuplicates: true });
  await prisma.category.createMany({ data: data.categories, skipDuplicates: true });
  await prisma.wallet.createMany({ data: data.wallets, skipDuplicates: true });
  await prisma.budget.createMany({ data: data.budgets, skipDuplicates: true });
  await prisma.goal.createMany({ data: data.goals, skipDuplicates: true });
  await prisma.debt.createMany({ data: data.debts, skipDuplicates: true });
  await prisma.recurring.createMany({ data: data.recurrings, skipDuplicates: true });
  await prisma.transaction.createMany({ data: data.transactions, skipDuplicates: true });
  await prisma.transactionAttachment.createMany({ data: data.transactionAttachments, skipDuplicates: true });
  await prisma.goalEntry.createMany({ data: data.goalEntries, skipDuplicates: true });
  await prisma.debtEntry.createMany({ data: data.debtEntries, skipDuplicates: true });
  await prisma.setting.createMany({ data: data.settings, skipDuplicates: true });

  console.log('Restore complete.');
}

main()
  .catch((err) => {
    console.error('Restore failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
