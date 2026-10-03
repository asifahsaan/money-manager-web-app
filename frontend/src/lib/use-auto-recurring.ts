import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { recurringService } from '@/services/recurring.service';

/** Everything that shows money, refreshed after recurring entries are added. */
export function refreshAfterRecurring(qc: QueryClient) {
  for (const key of ['transactions', 'calendar-transactions', 'wallets', 'wallet', 'recurrings', 'budgets', 'stats-summary', 'stats-trend', 'wallet-stats']) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Adds recurring transactions that have come due — when the app opens, when
 * the account changes and when the tab comes back after being hidden (e.g.
 * the next morning). The server dates each entry on its own due date.
 */
export function useAutoRecurring(accountId: number | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!accountId) return;
    let lastRun = 0;
    const run = async () => {
      if (Date.now() - lastRun < 60_000) return; // at most once a minute
      lastRun = Date.now();
      try {
        const { created } = await recurringService.processDue(accountId);
        if (created > 0) {
          toast.success(`Added ${created} recurring transaction${created === 1 ? '' : 's'}`);
          refreshAfterRecurring(qc);
        }
      } catch {
        /* offline or server waking up — the next visit will catch up */
      }
    };
    run();
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [accountId, qc]);
}
