import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { TABLES, delegates } from './lib/tables';

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/restore-database.ts <path-to-backup.json>');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`Restoring backup from ${data.exportedAt}...`);

  // TABLES is ordered parents before children
  const db = delegates(prisma);
  for (const { key, model } of TABLES) {
    const rows = data[key] ?? [];
    const { count } = await db[model].createMany({ data: rows, skipDuplicates: true });
    console.log(`${key}: ${count}/${rows.length} inserted`);
  }

  console.log('Restore complete.');
}

main()
  .catch((err) => {
    console.error('Restore failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
