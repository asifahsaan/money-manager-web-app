import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TABLES, delegates } from './lib/tables';

const prisma = new PrismaClient();

async function main() {
  const backupDir = join(__dirname, '..', 'backups');
  mkdirSync(backupDir, { recursive: true });

  console.log('Exporting all tables...');

  const data: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  const db = delegates(prisma);
  for (const { key, model } of TABLES) {
    data[key] = await db[model].findMany({ orderBy: { id: 'asc' } });
  }

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
