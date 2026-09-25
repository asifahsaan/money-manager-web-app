// Copies the whole production database (PostgreSQL, DATABASE_URL) into the
// local MySQL mirror (MIRROR_DATABASE_URL) and saves a dated JSON snapshot.
//
//   npm run mirror:sync            normal run (used by the daily scheduled task)
//   npm run mirror:sync -- --force skip the shrink safety check
//
// The mirror is replaced inside one MySQL transaction, so a failed run leaves
// the previous copy intact. If production suddenly has far fewer rows than the
// mirror (e.g. the hosted DB was wiped, like the Railway trial expiry), the run
// aborts instead of overwriting the last good local copy.
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClient as MirrorClient } from '../../node_modules/.prisma/mirror-client';
import { appendFileSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TABLES, delegates, Row, TableKey } from '../lib/tables';

const BATCH_SIZE = 1000;
const SNAPSHOTS_TO_KEEP = 30;
const SHRINK_LIMIT = 0.5; // abort if production has < 50% of the mirror's rows

const backupDir = join(__dirname, '..', '..', 'backups');
const snapshotDir = join(backupDir, 'daily');
const logFile = join(backupDir, 'mirror-sync.log');

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logFile, line + '\n');
}

// Prisma Decimal instances belong to one generated client; the mirror client
// accepts decimals as strings, so convert before handing rows across.
function toMirrorRow(row: Row): Row {
  const out: Row = {};
  for (const [field, value] of Object.entries(row)) {
    out[field] = Prisma.Decimal.isDecimal(value) ? (value as Prisma.Decimal).toString() : value;
  }
  return out;
}

function saveSnapshot(data: Record<TableKey, Row[]>) {
  mkdirSync(snapshotDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const filePath = join(snapshotDir, `snapshot-${day}.json`);
  writeFileSync(filePath, JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2));

  const old = readdirSync(snapshotDir)
    .filter((f) => /^snapshot-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .slice(0, -SNAPSHOTS_TO_KEEP);
  old.forEach((f) => unlinkSync(join(snapshotDir, f)));
  return filePath;
}

async function main() {
  const force = process.argv.includes('--force');
  if (!process.env.MIRROR_DATABASE_URL) {
    throw new Error('MIRROR_DATABASE_URL is not set in backend/.env');
  }

  mkdirSync(backupDir, { recursive: true });
  const source = new PrismaClient();
  const mirror = new MirrorClient();

  try {
    log('Mirror sync started');

    const data = {} as Record<TableKey, Row[]>;
    const src = delegates(source);
    for (const { key, model } of TABLES) {
      data[key] = await src[model].findMany({ orderBy: { id: 'asc' } });
    }

    const snapshotPath = saveSnapshot(data);
    log(`Snapshot saved: ${snapshotPath}`);

    const dst = delegates(mirror);
    const sourceTotal = TABLES.reduce((n, { key }) => n + data[key].length, 0);
    let mirrorTotal = 0;
    for (const { model } of TABLES) mirrorTotal += await dst[model].count();

    if (!force && mirrorTotal > 0 && sourceTotal < mirrorTotal * SHRINK_LIMIT) {
      throw new Error(
        `Production has ${sourceTotal} rows but the mirror has ${mirrorTotal}. ` +
          'Refusing to overwrite the local copy — check the online database, ' +
          'then re-run with --force if the drop is expected.',
      );
    }

    await mirror.$transaction(
      async (tx) => {
        // FK checks off for this connection only: tables are wiped and refilled
        // wholesale, and categories reference each other (parentCategoryId).
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        const t = delegates(tx);
        for (const { model } of [...TABLES].reverse()) await t[model].deleteMany();
        for (const { key, model } of TABLES) {
          const rows = data[key].map(toMirrorRow);
          for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            await t[model].createMany({ data: rows.slice(i, i + BATCH_SIZE) });
          }
        }
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
      },
      { maxWait: 30_000, timeout: 10 * 60_000 },
    );

    const counts = Object.fromEntries(TABLES.map(({ key }) => [key, data[key].length]));
    console.table(counts);
    log(`Mirror sync finished: ${sourceTotal} rows copied (${JSON.stringify(counts)})`);
  } finally {
    await Promise.all([source.$disconnect(), mirror.$disconnect()]);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  try {
    log(`Mirror sync FAILED: ${message}`);
  } catch {
    console.error(message);
  }
  process.exitCode = 1;
});
