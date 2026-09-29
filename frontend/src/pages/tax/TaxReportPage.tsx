import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, Info, Loader2, Scale,
} from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { taxReportService, type AuditFinding, type AuditItem, type HeadTotal, type TaxPeriodType } from '@/services/tax-report.service';
import { transactionService } from '@/services/transaction.service';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';
import { amount } from '@/lib/statement-export';
import { downloadTaxCsv, downloadTaxPdf } from '@/lib/tax-report-export';
import {
  EXPENSE_HEAD_OPTIONS, FBR_DISCLAIMER, GENERAL_REFS, HEAD_LABELS, INCOME_HEAD_OPTIONS, WEALTH_REFS, refsFor,
} from '@/lib/fbr-references';
import { apiErrorMessage } from '@/lib/api-error';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

const now = new Date();
const CURRENT_TAX_YEAR = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();

function Refs({ head }: { head: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {refsFor(head).map((r) => (
        <span key={r.section} title={r.note} className="cursor-help rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
          {r.section}
        </span>
      ))}
    </span>
  );
}

function HeadTable({ title, heads, total, totalLabel, tone }: { title: string; heads: HeadTotal[]; total: string; totalLabel: string; tone: string }) {
  return (
    <section className="card">
      <h2 className="px-5 pb-2 pt-4 text-sm font-semibold text-ink">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm tabular-nums">
          <thead>
            <tr className="border-y border-line bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <th className="px-5 py-2">Head / category</th>
              <th className="px-3 py-2 text-right">Txns</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-5 py-2">ITO 2001</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {heads.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-ink-muted">Nothing recorded in this period.</td></tr>
            )}
            {heads.map((h) => (
              <HeadRows key={h.head} h={h} />
            ))}
          </tbody>
          <tfoot className="border-t-2 border-line font-semibold">
            <tr>
              <td className="px-5 py-2.5 text-ink">{totalLabel}</td>
              <td />
              <td className={cn('px-3 py-2.5 text-right', tone)}>{amount(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function HeadRows({ h }: { h: HeadTotal }) {
  const excluded = h.head === 'NOT_INCOME' || h.head === 'NOT_EXPENSE';
  return (
    <>
      <tr className={cn('bg-primary-50/30 font-semibold', excluded && 'text-ink-muted')}>
        <td className="px-5 py-2">{h.label}</td>
        <td className="px-3 py-2 text-right">{h.categories.reduce((s, c) => s + c.count, 0)}</td>
        <td className="px-3 py-2 text-right">{amount(h.total)}</td>
        <td className="px-5 py-2"><Refs head={h.head} /></td>
      </tr>
      {h.categories.map((c) => (
        <tr key={`${h.head}-${c.id ?? c.name}`}>
          <td className="py-1.5 pl-9 pr-5 text-ink-muted">{c.name}</td>
          <td className="px-3 py-1.5 text-right text-ink-muted">{c.count}</td>
          <td className="px-3 py-1.5 text-right text-ink">{amount(c.total)}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

const SEVERITY = {
  error: { icon: AlertCircle, cls: 'text-red-600', badge: 'bg-red-50 text-red-700', label: 'Issue' },
  warning: { icon: AlertTriangle, cls: 'text-orange-600', badge: 'bg-orange-50 text-orange-700', label: 'Warning' },
  info: { icon: Info, cls: 'text-sky-600', badge: 'bg-sky-50 text-sky-700', label: 'Note' },
} as const;

function FindingRow({ f, onItem }: { f: AuditFinding; onItem: (i: AuditItem) => void }) {
  const [open, setOpen] = useState(f.severity === 'error');
  const s = SEVERITY[f.severity];
  const Icon = s.icon;
  return (
    <li className="border-t border-line first:border-t-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-gray-50" aria-expanded={open}>
        <Icon size={18} className={cn('mt-0.5 flex-shrink-0', s.cls)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {f.title} <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold', s.badge)}>{f.items.length}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{f.detail}</p>
        </div>
        <ChevronDown size={16} className={cn('mt-1 flex-shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="pb-2 pl-12 pr-5">
          {f.items.map((i, idx) => (
            <li key={`${i.kind}-${i.id}-${idx}`}>
              <button
                onClick={() => onItem(i)}
                disabled={i.id === 0}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                {i.date && <span className="w-20 flex-shrink-0 text-xs text-ink-muted">{i.date}</span>}
                <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                {i.amount && <span className="flex-shrink-0 font-medium tabular-nums text-ink">{amount(i.amount)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function TaxReportPage() {
  const accountId = useAccountStore((s) => s.activeAccountId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [periodType, setPeriodType] = useState<TaxPeriodType>('tax');
  const [year, setYear] = useState(CURRENT_TAX_YEAR);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});

  const years = useMemo(() => {
    const top = periodType === 'tax' ? CURRENT_TAX_YEAR + 1 : now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => top - i);
  }, [periodType]);

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['transactions', accountId, 'tax-report', periodType, year],
    queryFn: () => taxReportService.get(accountId!, periodType, year),
    enabled: !!accountId,
  });

  useEffect(() => {
    if (report) setDraft(Object.fromEntries(report.mapping.map((m) => [m.categoryId, m.head])));
  }, [report]);

  const saveMapping = useMutation({
    mutationFn: () => taxReportService.saveMapping(accountId!, draft),
    onSuccess: () => {
      toast.success('Mapping saved — report updated');
      qc.invalidateQueries({ queryKey: ['transactions', accountId, 'tax-report'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save mapping')),
  });

  const onItem = (i: AuditItem) => {
    if (i.kind === 'transaction') transactionService.get(i.id).then(setOpenTx).catch(() => toast.error('Could not open transaction'));
    else if (i.kind === 'debt') navigate('/wallet?tab=debt');
    else if (i.id) navigate(`/wallet/${i.id}`);
  };

  const handlePdf = async () => {
    if (!report) return;
    setPdfBusy(true);
    try {
      await downloadTaxPdf(report);
    } catch {
      toast.error('Could not create the PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const currency = report?.currency ?? 'Rs.';
  const residual = Number(report?.wealth.residual ?? 0);
  const control = 'h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Period</p>
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {([['tax', 'Tax year (Jul–Jun)'], ['calendar', 'Calendar year']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setPeriodType(t);
                  setYear(t === 'tax' ? CURRENT_TAX_YEAR : now.getFullYear());
                }}
                className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors', periodType === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="text-xs font-medium text-ink-muted">
          Year
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={cn(control, 'mt-1.5 block')}>
            {years.map((y) => (
              <option key={y} value={y}>
                {periodType === 'tax' ? `Tax Year ${y} (Jul ${y - 1} – Jun ${y})` : y}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => report && downloadTaxCsv(report)}
            disabled={!report}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> CSV
          </button>
          <button
            onClick={handlePdf}
            disabled={!report || pdfBusy}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Download PDF
          </button>
        </div>
      </div>

      {isError ? (
        <div className="card p-8 text-center text-sm text-expense">{apiErrorMessage(error, 'Could not build the report.')}</div>
      ) : isLoading || !report ? (
        <div className="card space-y-3 p-5">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
      ) : (
        <>
          {/* Header + summary */}
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Tax year report & audit</p>
                <h2 className="mt-0.5 text-lg font-semibold text-ink">{report.period.label}</h2>
                <p className="text-sm text-ink-muted">{report.holderName} · {report.accountName} · {currency}</p>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
                  report.audit.errors ? 'bg-red-50 text-red-700' : report.audit.warnings ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700',
                )}
              >
                {report.audit.errors ? <AlertCircle size={16} /> : report.audit.warnings ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                {report.audit.errors || report.audit.warnings
                  ? `${report.audit.errors} issue${report.audit.errors === 1 ? '' : 's'} · ${report.audit.warnings} warning${report.audit.warnings === 1 ? '' : 's'}`
                  : 'No issues found'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
              {[
                { label: 'Total income', value: report.income.total, tone: 'text-income' },
                { label: 'Personal expenses', value: report.expenses.total, tone: 'text-expense' },
                { label: 'Net assets at end', value: report.wealth.actualClosing, tone: 'text-ink' },
                { label: 'Unexplained difference', value: report.wealth.residual, tone: residual ? 'text-expense' : 'text-income' },
              ].map((t) => (
                <div key={t.label} className="bg-surface px-5 py-3.5">
                  <p className="text-xs text-ink-muted">{t.label}</p>
                  <p className={cn('mt-0.5 text-lg font-bold tabular-nums', t.tone)}>{amount(t.value)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Audit */}
          <section className="card">
            <h2 className="px-5 pb-2 pt-4 text-sm font-semibold text-ink">Data audit</h2>
            {report.audit.findings.length === 0 ? (
              <p className="flex items-center gap-2 px-5 pb-5 text-sm text-income"><CheckCircle2 size={16} /> Everything checks out for this period.</p>
            ) : (
              <ul>
                {report.audit.findings.map((f) => <FindingRow key={f.id} f={f} onItem={onItem} />)}
              </ul>
            )}
          </section>

          <HeadTable title="Income by head" heads={report.income.heads} total={report.income.total} totalLabel='Total income (excl. "not income")' tone="text-income" />
          <HeadTable title="Personal expenses by head (wealth statement)" heads={report.expenses.heads} total={report.expenses.total} totalLabel="Total personal expenses" tone="text-expense" />

          {/* Wealth */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Scale size={16} /> Wealth reconciliation</h2>
              <span className="flex gap-1">
                {WEALTH_REFS.map((r) => (
                  <span key={r.section} title={r.note} className="cursor-help rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">{r.section}</span>
                ))}
              </span>
            </div>
            <div className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="py-1.5">Assets / liabilities</th><th className="py-1.5 text-right">Start</th><th className="py-1.5 text-right">End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.wealth.closing.wallets.map((w) => (
                    <tr key={w.id}>
                      <td className="py-1.5 text-ink">{w.name}</td>
                      <td className="py-1.5 text-right text-ink-muted">{amount(report.wealth.opening.wallets.find((o) => o.id === w.id)?.amount ?? '0')}</td>
                      <td className="py-1.5 text-right text-ink">{amount(w.amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="py-1.5 text-ink">Savings goals</td><td className="py-1.5 text-right text-ink-muted">{amount(report.wealth.opening.goals)}</td><td className="py-1.5 text-right">{amount(report.wealth.closing.goals)}</td></tr>
                  <tr><td className="py-1.5 text-ink">Loans given (receivable)</td><td className="py-1.5 text-right text-ink-muted">{amount(report.wealth.opening.receivables)}</td><td className="py-1.5 text-right">{amount(report.wealth.closing.receivables)}</td></tr>
                  <tr><td className="py-1.5 text-ink">Loans taken (payable)</td><td className="py-1.5 text-right text-ink-muted">({amount(report.wealth.opening.payables)})</td><td className="py-1.5 text-right">({amount(report.wealth.closing.payables)})</td></tr>
                </tbody>
                <tfoot className="border-t-2 border-line font-semibold">
                  <tr><td className="py-2 text-ink">Net assets</td><td className="py-2 text-right">{amount(report.wealth.opening.net)}</td><td className="py-2 text-right">{amount(report.wealth.closing.net)}</td></tr>
                </tfoot>
              </table>
              <table className="w-full text-sm tabular-nums">
                <tbody className="divide-y divide-gray-100">
                  {report.wealth.lines.map((l) => (
                    <tr key={l.key}><td className="py-1.5 text-ink">{l.label}</td><td className="py-1.5 text-right">{amount(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-line font-semibold">
                  <tr><td className="py-1.5">Expected closing net assets</td><td className="py-1.5 text-right">{amount(report.wealth.expectedClosing)}</td></tr>
                  <tr><td className="py-1.5">Actual closing net assets</td><td className="py-1.5 text-right">{amount(report.wealth.actualClosing)}</td></tr>
                  <tr className={residual ? 'text-expense' : 'text-income'}>
                    <td className="py-1.5">Unexplained difference {residual ? '' : '✓'}</td>
                    <td className="py-1.5 text-right">{amount(report.wealth.residual)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Mapping */}
          <section className="card">
            <button onClick={() => setShowMapping((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left" aria-expanded={showMapping}>
              <div>
                <h2 className="text-sm font-semibold text-ink">Category → head mapping</h2>
                <p className="text-xs text-ink-muted">Defaults are guessed from category names. Change any to match how you file.</p>
              </div>
              <ChevronDown size={16} className={cn('text-ink-muted transition-transform', showMapping && 'rotate-180')} />
            </button>
            {showMapping && (
              <div className="border-t border-line px-5 py-4">
                <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                  {(['INCOME', 'EXPENSE'] as const).map((type) => (
                    <div key={type}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{type === 'INCOME' ? 'Income categories' : 'Expense categories'}</p>
                      <ul className="space-y-1.5">
                        {report.mapping.filter((m) => m.type === type).map((m) => (
                          <li key={m.categoryId} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm text-ink" title={m.parent ? `${m.parent} › ${m.name}` : m.name}>
                              {m.parent ? <span className="text-ink-muted">{m.parent} › </span> : null}{m.name}
                            </span>
                            <select
                              value={draft[m.categoryId] ?? m.head}
                              onChange={(e) => setDraft((d) => ({ ...d, [m.categoryId]: e.target.value }))}
                              className={cn(control, 'h-8 w-52 text-xs')}
                            >
                              {(type === 'INCOME' ? INCOME_HEAD_OPTIONS : EXPENSE_HEAD_OPTIONS).map((h) => (
                                <option key={h} value={h}>{HEAD_LABELS[h]}</option>
                              ))}
                            </select>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => saveMapping.mutate()}
                    disabled={saveMapping.isPending}
                    className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {saveMapping.isPending ? 'Saving…' : 'Save mapping'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* References */}
          <section className="card px-5 py-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">References — Income Tax Ordinance, 2001</h2>
            <ul className="grid gap-1.5 text-sm md:grid-cols-2">
              {GENERAL_REFS.map((r) => (
                <li key={r.section}><span className="font-semibold text-primary-700">{r.section}</span> <span className="text-ink-muted">— {r.note}</span></li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs leading-relaxed text-orange-800">{FBR_DISCLAIMER}</p>
          </section>
        </>
      )}

      {openTx && accountId && (
        <TransactionModal accountId={accountId} currency={currency} editing={openTx} onClose={() => setOpenTx(null)} />
      )}
    </div>
  );
}
