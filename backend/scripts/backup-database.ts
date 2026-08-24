import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const backupDir = join(__dirname, '..', 'backups');
  mkdirSync(backupDir, { recursive: true });

  console.log('Exporting all tables...');

  const data = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    accounts: await prisma.account.findMany(),
    wallets: await prisma.wallet.findMany(),
    categories: await prisma.category.findMany(),
    transactions: await prisma.transaction.findMany(),
    transactionAttachments: await prisma.transactionAttachment.findMany(),
    budgets: await prisma.budget.findMany(),
    goals: await prisma.goal.findMany(),
    goalEntries: await prisma.goalEntry.findMany(),
    debts: await prisma.debt.findMany(),
    debtEntries: await prisma.debtEntry.findMany(),
    recurrings: await prisma.recurring.findMany(),
    settings: await prisma.setting.findMany(),
  };

  const counts = Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, (v as unknown[]).length]),
  );
  console.table(counts);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(backupDir, `backup-${timestamp}.json`);

  writeFileSync(
    filePath,
    JSON.stringify(data, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
  );

  console.log(`\nBackup saved to: ${filePath}`);
}

main()
  .catch((err) => {
    console.error('Backup failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
