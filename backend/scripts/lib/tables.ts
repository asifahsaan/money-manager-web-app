// Every Prisma model, keyed by the name used in JSON backups.
// Order is parent-before-child so inserts work even with foreign keys enabled.
export const TABLES = [
  { key: 'users', model: 'user' },
  { key: 'accounts', model: 'account' },
  { key: 'categories', model: 'category' },
  { key: 'wallets', model: 'wallet' },
  { key: 'budgets', model: 'budget' },
  { key: 'goals', model: 'goal' },
  { key: 'debts', model: 'debt' },
  { key: 'recurrings', model: 'recurring' },
  { key: 'transactions', model: 'transaction' },
  { key: 'transactionAttachments', model: 'transactionAttachment' },
  { key: 'goalEntries', model: 'goalEntry' },
  { key: 'debtEntries', model: 'debtEntry' },
  { key: 'settings', model: 'setting' },
] as const;

export type TableKey = (typeof TABLES)[number]['key'];
export type ModelName = (typeof TABLES)[number]['model'];
export type Row = Record<string, unknown>;

// Minimal shape shared by every Prisma model delegate — lets scripts loop
// over tables generically without tying them to one generated client.
export interface ModelDelegate {
  findMany(args?: { orderBy?: { id: 'asc' } }): Promise<Row[]>;
  createMany(args: { data: Row[]; skipDuplicates?: boolean }): Promise<{ count: number }>;
  deleteMany(): Promise<{ count: number }>;
  count(): Promise<number>;
}

export function delegates(client: unknown): Record<ModelName, ModelDelegate> {
  return client as Record<ModelName, ModelDelegate>;
}
