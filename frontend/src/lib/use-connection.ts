import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useConnectionStore } from '@/stores/connection.store';

const RETRY_EVERY_MS = 20_000;

export type ConnectionProblem = 'offline' | 'unreachable' | null;

export function useConnectionProblem(): ConnectionProblem {
  const { online, reachable } = useConnectionStore();
  if (!online) return 'offline';
  return reachable ? null : 'unreachable';
}

/**
 * Follows the network and, while something is wrong, keeps retrying — so the
 * app recovers by itself when the internet returns or the server wakes up.
 */
export function useConnectionWatcher(retry: () => void) {
  const problem = useConnectionProblem();
  const setOnline = useConnectionStore((s) => s.setOnline);
  const hadProblem = useRef(false);
  const retryRef = useRef(retry);
  retryRef.current = retry;

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      retryRef.current();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (problem) {
      hadProblem.current = true;
      const timer = setInterval(() => retryRef.current(), RETRY_EVERY_MS);
      return () => clearInterval(timer);
    }
    if (hadProblem.current) {
      hadProblem.current = false;
      toast.success('Back online');
    }
  }, [problem]);
}

/**
 * True when the open page is missing data because its request failed. Its
 * numbers would read as Rs. 0, so the page is replaced by an explanation.
 */
export function usePageDataMissing() {
  const qc = useQueryClient();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const cache = qc.getQueryCache();
    const check = () =>
      setMissing(cache.findAll({ type: 'active' }).some((q) => q.state.data === undefined && q.state.errorUpdateCount > 0));
    check();
    return cache.subscribe(check);
  }, [qc]);

  return missing;
}
