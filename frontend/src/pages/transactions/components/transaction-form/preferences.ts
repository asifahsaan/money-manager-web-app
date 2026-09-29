// Small per-account memories that make entry faster. Browser-only; losing
// them just means sensible defaults again.

const usageKey = (accountId: number) => `mm_cat_usage_${accountId}`;
const walletKey = (accountId: number) => `mm_last_wallet_${accountId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export function categoryUsage(accountId: number): Record<string, number> {
  return read<Record<string, number>>(usageKey(accountId), {});
}

export function recordCategoryUse(accountId: number, categoryId: number | undefined) {
  if (!categoryId) return;
  const usage = categoryUsage(accountId);
  usage[categoryId] = (usage[categoryId] ?? 0) + 1;
  write(usageKey(accountId), usage);
}

export function lastWallet(accountId: number): number | undefined {
  return read<number | undefined>(walletKey(accountId), undefined);
}

export function rememberWallet(accountId: number, walletId: number | undefined) {
  if (walletId) write(walletKey(accountId), walletId);
}
