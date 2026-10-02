import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, FileSpreadsheet, History, Loader2, Pencil } from 'lucide-react';
import { debtService, type DebtActivityKind, type DebtActivityParams, type DebtActivityRow } from '@/services/debt.service';
import { save } from '@/lib/statement-export';
import { formatCurrency, cn } from '@/lib/utils';
import type { Debt } from '@/types';

const PAGE_SIZE = 15;

export const KIND_LABEL: Record<DebtActivityKind, string> = {
  LENT: 'Lent',
  BORROWED: 'Borrowed',
  COLLECTED: 'Received back',
  REPAID: 'Paid back',
};

function describe(r: DebtActivityRow, walletName: string | null) {
  const via = walletName ? (r.direction === 'IN' ? ` · into ${walletName}` : ` · from ${walletName}`) : '';
  switch (r.kind) {
    case 'LENT': return `Lent to ${r.personName}${via}`;
    case 'BORROWED': return `Borrowed from ${r.personName}${via}`;
    case 'COLLECTED': return `${r.personName} paid back${via}`;
    case 'REPAID': return `Paid back ${r.personName}${via}`;
  }
}

interface Props {
  accountId: number;
  currency: string;
  wallets: { id: number; name: string }[];
  debts: Debt[];
  /** Show only one debt's history (person filter hidden). */
  debtId?: number;
  onEditEntry?: (row: DebtActivityRow) => void;
  /** Inside a modal: no card chrome or title. */
  bare?: boolean;
}

export function DebtActivityLog({ accountId, currency, wallets, debts, debtId, onEditEntry, bare }: Props) {
  const [kind, setKind] = useState<DebtActivityKind | ''>('');
  const [person, setPerson] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const params: DebtActivityParams = {
    accountId,
    debtId: debtId ?? (person || undefined),
    kind: kind || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['debts', accountId, 'activity', params, page],
    queryFn: () => debtService.activity({ ...params, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const walletName = (id: number | null) => (id ? wallets.find((w) => w.id === id)?.name ?? null : null);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filtersOn = !!(kind || person || startDate || endDate);
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  async function exportCsv() {
    setExporting(true);
    try {
      const rows: DebtActivityRow[] = [];
      for (let p = 1; ; p++) {
        const res = await debtService.activity({ ...params, page: p, limit: 100 });
        rows.push(...res.data);
        if (rows.length >= res.total || res.data.length === 0) break;
      }
      const cell = (v: string | number | null) => {
        const s = v == null ? '' : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        ['Date', 'Person', 'Activity', 'Wallet', 'Money in', 'Money out', 'Note'].join(','),
        ...rows.map((r) =>
          [r.date, r.personName, KIND_LABEL[r.kind], walletName(r.walletId), r.direction === 'IN' ? Number(r.amount).toFixed(2) : '', r.direction === 'OUT' ? Number(r.amount).toFixed(2) : '', r.note]
            .map(cell)
            .join(','),
        ),
      ];
      save(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `debt-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch {
      toast.error('Could not export the log');
    } finally {
      setExporting(false);
    }
  }

  const ctl = 'h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink focus:border-primary-500 focus:outline-none';

  return (
    <div className={cn(!bare && 'card')}>
      <div className={cn('flex flex-wrap items-center gap-2', bare ? 'pb-3' : 'border-b border-line px-4 py-3')}>
        {!bare && (
          <p className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-ink">
            <History size={16} className="text-ink-muted" /> Activity log
          </p>
        )}
        <select value={kind} onChange={(e) => set(setKind)(e.target.value as DebtActivityKind | '')} className={ctl} aria-label="Activity type">
          <option value="">All activity</option>
          {(Object.keys(KIND_LABEL) as DebtActivityKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        {debtId === undefined && (
          <select value={person} onChange={(e) => set(setPerson)(e.target.value ? Number(e.target.value) : '')} className={cn(ctl, 'max-w-[160px]')} aria-label="Person">
            <option value="">Everyone</option>
            {[...debts].sort((a, b) => a.personName.localeCompare(b.personName)).map((d) => (
              <option key={d.id} value={d.id}>{d.personName}{d.description ? ` — ${d.description.slice(0, 20)}` : ''}</option>
            ))}
          </select>
        )}
        <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => set(setStartDate)(e.target.value)} className={ctl} aria-label="From date" />
        <span className="text-xs text-ink-muted">to</span>
        <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => set(setEndDate)(e.target.value)} className={ctl} aria-label="To date" />
        {filtersOn && (
          <button onClick={() => { setKind(''); setPerson(''); setStartDate(''); setEndDate(''); setPage(1); }} className="text-xs font-medium text-primary-600 hover:underline">
            Clear
          </button>
        )}
        <button
          onClick={exportCsv}
          disabled={exporting || !data?.total}
          className={cn(ctl, 'flex items-center gap-1 font-semibold hover:bg-gray-50 disabled:opacity-50', bare && 'ml-auto')}
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} CSV
        </button>
      </div>

      {isLoading ? (
        <div className={cn('space-y-2', !bare && 'p-4')}>{[0, 1, 2].map((i) => <div key={i} className="skeleton h-9 w-full" />)}</div>
      ) : !data || data.total === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">{filtersOn ? 'No activity matches these filters.' : 'No activity yet.'}</p>
      ) : (
        <>
          <ul className={cn('divide-y divide-gray-100', isFetching && 'opacity-60')}>
            {data.data.map((r) => {
              const isIn = r.direction === 'IN';
              return (
                <li key={r.id} className={cn('flex items-center gap-3 py-2.5', !bare && 'px-4')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', isIn ? 'bg-income-light text-income' : 'bg-expense-light text-expense')}>
                    {isIn ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{describe(r, walletName(r.walletId))}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {format(parseISO(r.date), 'd MMM yyyy')}{r.note ? ` · ${r.note}` : ''}
                    </p>
                  </div>
                  <span className={cn('whitespace-nowrap text-sm font-semibold tabular-nums', isIn ? 'text-income' : 'text-expense')}>
                    {isIn ? '+' : '−'} {formatCurrency(Number(r.amount), currency)}
                  </span>
                  {onEditEntry && (
                    <button
                      onClick={() => onEditEntry(r)}
                      disabled={!r.entryId}
                      title={r.entryId ? 'Edit this entry' : 'Edit the debt itself to change this'}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-gray-100 hover:text-ink disabled:invisible"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 text-xs text-ink-muted', !bare && 'px-4')}>
            <span>
              In <b className="text-income">{formatCurrency(Number(data.totalIn), currency)}</b>
              {' · '}Out <b className="text-expense">{formatCurrency(Number(data.totalOut), currency)}</b>
              {' · '}{data.total} entr{data.total === 1 ? 'y' : 'ies'}
            </span>
            <Pager page={page} pages={pages} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-gray-100 disabled:opacity-40">
        <ChevronLeft size={15} />
      </button>
      <span className="min-w-[80px] text-center text-xs font-medium text-ink">Page {page} of {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-gray-100 disabled:opacity-40">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
