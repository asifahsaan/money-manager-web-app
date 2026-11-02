import { useState } from 'react';
import { CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionProblem } from '@/lib/use-connection';

const COPY = {
  offline: {
    icon: WifiOff,
    title: 'No internet connection',
    banner: 'No internet. Figures may be out of date.',
    detail: 'Check your Wi-Fi or mobile data. The app will load by itself when you are back online.',
  },
  unreachable: {
    icon: CloudOff,
    title: "Can't reach the server",
    banner: "Can't reach the server. Figures may be out of date.",
    detail: 'It may be waking up, which can take up to a minute. The app keeps trying by itself.',
  },
};

/** Runs a retry and spins until it finishes. */
function useBusy(action: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  return [busy, run] as const;
}

export function RefreshButton({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [busy, run] = useBusy(onRefresh);
  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      title="Refresh"
      aria-label="Refresh"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
    >
      <RefreshCw size={18} className={cn(busy && 'animate-spin')} />
    </button>
  );
}

/** Slim strip under the header: the page still shows what it already had. */
export function ConnectionBanner({ problem, onRetry }: { problem: Exclude<ConnectionProblem, null>; onRetry: () => Promise<unknown> }) {
  const { icon: Icon, banner } = COPY[problem];
  const [busy, run] = useBusy(onRetry);
  return (
    <div role="status" className="flex flex-shrink-0 items-center gap-2 border-b border-line bg-expense-light px-4 py-2 text-xs font-medium text-expense lg:px-6">
      <Icon size={14} className="flex-shrink-0" />
      <span className="min-w-0 flex-1">{banner}</span>
      <button onClick={() => void run()} disabled={busy} className="flex flex-shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
        {busy && <Loader2 size={12} className="animate-spin" />}
        Retry
      </button>
    </div>
  );
}

/** A page crashed or its code couldn't download (offline, or a new version just went live). */
export function RouteErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-ink-muted">
        <CloudOff size={28} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">This page couldn't open</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">Check your internet and reload. Your data is safe.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white"
      >
        <RefreshCw size={15} /> Reload
      </button>
    </div>
  );
}

/** Takes the place of a page that has nothing to show, instead of blanks or Rs. 0. */
export function ConnectionErrorScreen({ problem, onRetry }: { problem: ConnectionProblem; onRetry: () => Promise<unknown> }) {
  const { icon: Icon, title, detail } = COPY[problem ?? 'unreachable'];
  const [busy, run] = useBusy(onRetry);
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-ink-muted">
        <Icon size={28} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">{detail}</p>
      <p className="mt-1 text-sm text-ink-muted">Your data is safe.</p>
      <button
        onClick={() => void run()}
        disabled={busy}
        className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-70"
      >
        <RefreshCw size={15} className={cn(busy && 'animate-spin')} />
        {busy ? 'Trying…' : 'Try again'}
      </button>
    </div>
  );
}
