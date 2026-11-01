import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FileText, Search, X } from 'lucide-react';
import type { Debt } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { personKey } from '@/lib/debt-statement';

interface Person {
  name: string;
  open: number;
  settled: number;
  /** what they owe me minus what I owe them, over open debts */
  net: number;
}

/** Choose who the statement is for — everyone you have debts with, biggest balance first. */
export function StatementPersonPicker({ debts, currency, onPick, onClose }: {
  debts: Debt[];
  currency: string;
  onPick: (personName: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    for (const d of debts) {
      const key = personKey(d.personName);
      const p = map.get(key) ?? { name: d.personName.trim(), open: 0, settled: 0, net: 0 };
      if (d.status === 'CLOSED') p.settled++;
      else {
        p.open++;
        p.net += (d.type === 'RECEIVABLE' ? 1 : -1) * Number(d.remainingAmount);
      }
      map.set(key, p);
    }
    return [...map.values()].sort((a, b) => Number(b.open > 0) - Number(a.open > 0) || Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));
  }, [debts]);

  const shown = q.trim() ? people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : people;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Choose a person" className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileText size={17} className="text-primary-600" /> Statement for…
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-gray-100"><X size={18} className="text-ink-muted" /></button>
        </div>
        <div className="border-b border-line px-5 py-2.5">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3">
            <Search size={14} className="text-ink-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && shown[0]) onPick(shown[0].name); }}
              placeholder="Search a name"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </label>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
          {shown.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-muted">No one by that name.</li>}
          {shown.map((p) => {
            const initials = p.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
            return (
              <li key={p.name}>
                <button onClick={() => onPick(p.name)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-primary-50/50">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', p.open ? (p.net >= 0 ? 'bg-income' : 'bg-expense') : 'bg-gray-400')}>
                    {initials || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {p.open ? `${p.open} open` : 'All settled'}{p.settled ? ` · ${p.settled} settled` : ''}
                    </span>
                  </span>
                  {p.open > 0 && (
                    <span className="text-right">
                      <span className={cn('block text-sm font-bold tabular-nums', p.net >= 0 ? 'text-income' : 'text-expense')}>{formatCurrency(Math.abs(p.net), currency)}</span>
                      <span className="block text-[10px] text-ink-muted">{p.net >= 0 ? 'owes you' : 'you owe'}</span>
                    </span>
                  )}
                  <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
