import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { walletService } from '@/services/wallet.service';
import { statementService } from '@/services/statement.service';
import { amount, downloadStatementCsv, downloadStatementPdf, periodLabel } from '@/lib/statement-export';
import { cn } from '@/lib/utils';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function StatementsPage() {
  const accountId = useAccountStore((s) => s.activeAccountId);
  const [params] = useSearchParams();

  const [mode, setMode] = useState<'month' | 'custom'>('month');
  const [month, setMonth] = useState(() => {
    const m = params.get('month');
    return m ? startOfMonth(parseISO(`${m}-01`)) : startOfMonth(new Date());
  });
  const [customStart, setCustomStart] = useState(() => ymd(startOfMonth(new Date())));
  const [customEnd, setCustomEnd] = useState(() => ymd(new Date()));
  const [walletId, setWalletId] = useState<number | ''>(() => (params.get('walletId') ? Number(params.get('walletId')) : ''));
  const [pdfBusy, setPdfBusy] = useState(false);

  const startDate = mode === 'month' ? ymd(startOfMonth(month)) : customStart;
  const endDate = mode === 'month' ? ymd(endOfMonth(month)) : customEnd;
  const rangeValid = !!startDate && !!endDate && startDate <= endDate;

  const { data: wallets } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ['transactions', accountId, 'statement', walletId, startDate, endDate],
    queryFn: () =>
      statementService.get({ accountId: accountId!, walletId: walletId || undefined, startDate, endDate }),
    enabled: !!accountId && rangeValid,
  });

  const summary = useMemo(
    () =>
      statement
        ? [
            { label: 'Opening balance', value: statement.openingBalance, tone: 'text-ink' },
            { label: 'Money in (credit)', value: statement.totalCredit, tone: 'text-income' },
            { label: 'Money out (debit)', value: statement.totalDebit, tone: 'text-expense' },
            { label: 'Closing balance', value: statement.closingBalance, tone: 'text-ink' },
          ]
        : [],
    [statement],
  );

  const handlePdf = async () => {
    if (!statement) return;
    setPdfBusy(true);
    try {
      await downloadStatementPdf(statement);
    } catch {
      toast.error('Could not create the PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const currency = statement?.currency ?? 'Rs.';
  const inputCls = 'h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-muted">Period</p>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              {(['month', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    mode === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {m === 'month' ? 'Monthly' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'month' ? (
            <div className="flex items-center gap-1">
              <button onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-gray-100">
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[130px] text-center text-sm font-semibold text-ink">{format(month, 'MMMM yyyy')}</span>
              <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-gray-100">
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-ink-muted">
                From
                <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className={cn(inputCls, 'mt-1.5 block')} />
              </label>
              <label className="text-xs font-medium text-ink-muted">
                To
                <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className={cn(inputCls, 'mt-1.5 block')} />
              </label>
            </div>
          )}

          <label className="text-xs font-medium text-ink-muted">
            Wallet
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : '')}
              className={cn(inputCls, 'mt-1.5 block min-w-[180px]')}
            >
              <option value="">All wallets</option>
              {(wallets ?? []).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => statement && downloadStatementCsv(statement)}
              disabled={!statement}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet size={16} /> CSV
            </button>
            <button
              onClick={handlePdf}
              disabled={!statement || pdfBusy}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Download PDF
            </button>
          </div>
        </div>
        {!rangeValid && <p className="mt-2 text-xs font-medium text-expense">"From" must be on or before "To".</p>}
      </div>

      {/* Statement */}
      {isError ? (
        <div className="card p-8 text-center text-sm text-expense">Could not load the statement. Please try again.</div>
      ) : isLoading || !statement ? (
        <div className="card space-y-3 p-5">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-8 w-full" />)}
        </div>
      ) : (
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Account statement</p>
              <h2 className="mt-0.5 text-lg font-semibold text-ink">{statement.holderName}</h2>
              <p className="text-sm text-ink-muted">{statement.accountName} · {statement.scope.label}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-ink">{periodLabel(statement)}</p>
              <p className="text-ink-muted">{statement.rows.length} transaction{statement.rows.length === 1 ? '' : 's'} · {currency}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label} className="bg-surface px-5 py-3.5">
                <p className="text-xs text-ink-muted">{s.label}</p>
                <p className={cn('mt-0.5 text-lg font-bold tabular-nums', s.tone)}>{amount(s.value)}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm tabular-nums">
              <thead>
                <tr className="border-y border-line bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Wallet</th>
                  <th className="px-3 py-2.5 text-right">Debit</th>
                  <th className="px-3 py-2.5 text-right">Credit</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-primary-50/40 font-medium">
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-muted">{format(parseISO(statement.period.startDate), 'dd MMM')}</td>
                  <td className="px-3 py-2.5 text-ink" colSpan={5}>Opening balance</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-ink">{amount(statement.openingBalance)}</td>
                </tr>
                {statement.rows.map((r) => (
                  <tr key={`${r.id}-${r.description}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-2.5 text-ink-muted">{format(parseISO(r.date), 'dd MMM')}</td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 font-medium text-ink" title={r.description}>{r.description}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-muted" title={r.category ?? ''}>{r.category ?? '—'}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-muted" title={r.wallet}>{r.wallet}</td>
                    <td className="px-3 py-2.5 text-right text-expense">{Number(r.debit) ? amount(r.debit) : ''}</td>
                    <td className="px-3 py-2.5 text-right text-income">{Number(r.credit) ? amount(r.credit) : ''}</td>
                    <td className={cn('px-5 py-2.5 text-right font-semibold', Number(r.balance) < 0 ? 'text-expense' : 'text-ink')}>{amount(r.balance)}</td>
                  </tr>
                ))}
                {statement.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-ink-muted">No transactions in this period.</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-line font-semibold">
                <tr>
                  <td className="px-5 py-2.5" />
                  <td className="px-3 py-2.5 text-ink" colSpan={3}>Totals</td>
                  <td className="px-3 py-2.5 text-right text-expense">{amount(statement.totalDebit)}</td>
                  <td className="px-3 py-2.5 text-right text-income">{amount(statement.totalCredit)}</td>
                  <td className="px-5 py-2.5" />
                </tr>
                <tr className="bg-primary-50/40">
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-muted">{format(parseISO(statement.period.endDate), 'dd MMM')}</td>
                  <td className="px-3 py-2.5 text-ink" colSpan={5}>Closing balance</td>
                  <td className="px-5 py-2.5 text-right text-ink">{amount(statement.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
