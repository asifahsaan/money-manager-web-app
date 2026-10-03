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

// While the app is open and visible; hidden tabs don't poll (they catch up on return)
const CHECK_EVERY_MS = 2 * 60_000;

/**
 * Adds recurring transactions that have come due — when the app opens, when
 * the account changes, when the tab comes back after being hidden, and every
 * couple of minutes while it stays open (so an 8:30 AM item shows up at 8:30
 * without a refresh). The server dates each entry on its own due date.
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
    const timer = window.setInterval(onVisible, CHECK_EVERY_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [accountId, qc]);
}
