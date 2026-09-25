import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RELEASES, LATEST_VERSION, type ChangeKind } from '@/data/releases';
import { cn } from '@/lib/utils';

const SEEN_KEY = 'mm_whats_new_seen';

const KIND_STYLE: Record<ChangeKind, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-primary-100 text-primary-700' },
  improved: { label: 'Improved', className: 'bg-blue-100 text-blue-700' },
  fixed: { label: 'Fixed', className: 'bg-green-100 text-green-700' },
  security: { label: 'Security', className: 'bg-purple-100 text-purple-700' },
};

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(() => readSeen() !== LATEST_VERSION);

  function handleOpen() {
    setOpen(true);
    setHasUnseen(false);
    try {
      localStorage.setItem(SEEN_KEY, LATEST_VERSION);
    } catch {
      // storage unavailable — the dot just reappears next visit
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium',
          'text-app-text-secondary hover:bg-gray-100 transition-colors',
        )}
        aria-label="What's new"
      >
        <Sparkles size={17} className="text-primary-500" />
        <span className="hidden sm:inline">What's New</span>
        {hasUnseen && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>
      {open && <WhatsNewModal onClose={() => setOpen(false)} />}
    </>
  );
}

function WhatsNewModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal to <body>: the header's backdrop-filter would otherwise become the
  // containing block for `fixed` and trap the modal inside the header.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" />
            <h2 id="whats-new-title" className="text-base font-semibold text-gray-800">
              What's New
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100" aria-label="Close">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <ol className="space-y-6">
            {RELEASES.map((release, i) => (
              <li key={release.version}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-bold text-gray-800">v{release.version}</span>
                  {i === 0 && (
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Latest
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {format(parseISO(release.date), 'd MMM yyyy')}
                  </span>
                </div>
                <p className="mb-2 text-sm font-medium text-gray-700">{release.title}</p>
                <ul className="space-y-1.5">
                  {release.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span
                        className={cn(
                          'mt-0.5 w-[4.5rem] flex-shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10px] font-semibold',
                          KIND_STYLE[change.kind].className,
                        )}
                      >
                        {KIND_STYLE[change.kind].label}
                      </span>
                      <span>{change.text}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>,
    document.body,
  );
}
