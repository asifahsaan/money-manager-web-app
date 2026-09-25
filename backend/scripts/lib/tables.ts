// Every Prisma model, keyed by the name used in JSON backups (`table` = @@map name).
// Order is parent-before-child so inserts work even with foreign keys enabled.
export const TABLES = [
  { key: 'users', model: 'user', table: 'users' },
  { key: 'accounts', model: 'account', table: 'accounts' },
  { key: 'categories', model: 'category', table: 'categories' },
  { key: 'wallets', model: 'wallet', table: 'wallets' },
  { key: 'budgets', model: 'budget', table: 'budgets' },
  { key: 'goals', model: 'goal', table: 'goals' },
  { key: 'debts', model: 'debt', table: 'debts' },
  { key: 'recurrings', model: 'recurring', table: 'recurrings' },
  { key: 'transactions', model: 'transaction', table: 'transactions' },
  { key: 'transactionAttachments', model: 'transactionAttachment', table: 'transaction_attachments' },
  { key: 'goalEntries', model: 'goalEntry', table: 'goal_entries' },
  { key: 'debtEntries', model: 'debtEntry', table: 'debt_entries' },
  { key: 'settings', model: 'setting', table: 'settings' },
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
