import type { QueryClient } from '@tanstack/react-query';

// Every cached query whose numbers change when money moves. Invalidate them
// together after any transaction/debt/goal write so no screen shows stale totals.
const MONEY_QUERY_ROOTS = new Set([
  'transactions',
  'calendar-transactions',
  'wallets',
  'wallet',
  'wallet-stats',
  'stats-summary',
  'stats-trend',
  'budgets',
  'goals',
  'debts',
  'overview',
]);

export function invalidateMoneyQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (q) => MONEY_QUERY_ROOTS.has(String(q.queryKey[0])),
  });
}
