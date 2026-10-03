import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, TrendingDown, Wand2 } from 'lucide-react';
import { insightsService } from '@/services/insights.service';
import { budgetPace, paceDay } from '@/lib/budget-pace';
import { MASK } from '@/lib/use-privacy';
import { cn, formatCurrency } from '@/lib/utils';
import type { Budget } from '@/types';

type Alert = { tone: 'danger' | 'warning'; title: string; detail?: string; to: string };

/**
 * "Where is this month heading?" — the month-end forecast per wallet, plus
 * wallets about to go below zero and budgets that will run out early.
 */
export function InsightsCard({ accountId, currency, budgets, hideAmounts }: {
  accountId: number;
  currency: string;
  budgets: Budget[];
  hideAmounts: boolean;
}) {
  const { data: f, isLoading } = useQuery({
    queryKey: ['insights', 'forecast', accountId],
    queryFn: () => insightsService.forecast(accountId),
    staleTime: 60_000,
  });
  const money = (n: number) => (hideAmounts ? MASK : formatCurrency(Math.round(n), currency));
  const day = (s: string) => format(parseISO(s), 'EEE d MMM');

  const alerts: Alert[] = [];
  for (const w of f?.wallets ?? []) {
    if (!w.negativeOn) continue;
    const tip = f!.tips.find((t) => t.walletId === w.walletId);
    alerts.push({
      tone: 'danger',
      title: w.current < 0 ? `${w.name} is already below zero` : `${w.name} may go below zero on ${day(w.negativeOn)}`,
      detail: tip?.fromName
        ? `Move about ${money(tip.need)} from ${tip.fromName} to cover it.`
        : `Lowest point about ${money(w.lowest)} on ${day(w.lowestDate)}.`,
      to: `/wallet/${w.walletId}`,
    });
  }
  for (const b of budgets) {
    const p = budgetPace(b);
    if (p.status === 'over') {
      alerts.push({ tone: 'danger', title: `${b.category.name} budget is used up`, detail: `Over by ${money(b.spent - Number(b.amount))}.`, to: '/wallet?tab=budget' });
    } else if (p.status === 'will-run-out' && p.runsOutOn) {
      alerts.push({
        tone: 'warning',
        title: `${b.category.name} budget runs out around ${paceDay(p.runsOutOn)}`,
        detail: `At this pace you'll spend about ${money(p.projected)} of ${money(Number(b.amount))}.`,
        to: '/wallet?tab=budget',
      });
    }
  }

  const t = f?.total;
  const counted = (f?.wallets ?? []).filter((w) => w.includedInTotal);

  return (
    <section className="card" aria-label="Month-end forecast">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Wand2 size={16} className="text-primary-600" /> Month-end forecast
          {f && <span className="text-xs font-normal text-ink-muted">· {f.daysLeft} day{f.daysLeft === 1 ? '' : 's'} left in {format(parseISO(f.monthEnd), 'MMMM')}</span>}
        </h2>
        <span className="flex items-center gap-1 text-[11px] text-ink-muted" title={`Today's balances, recurring items still to come, and your usual day-to-day spending over the last ${f?.historyDays ?? 60} days`}>
          <Info size={12} /> How it's worked out
        </span>
      </div>

      {isLoading || !f || !t ? (
        <div className="grid gap-3 px-4 pb-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      ) : (
        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Forecast */}
          <div>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <div>
                <p className="text-[11px] text-ink-muted">Now</p>
                <p className="text-lg font-bold tabular-nums text-ink">{money(t.current)}</p>
              </div>
              <ArrowRight size={16} className="mb-1.5 text-ink-muted" />
              <div>
                <p className="text-[11px] text-ink-muted">Expected on {format(parseISO(f.monthEnd), 'd MMM')}</p>
                <p className={cn('text-lg font-bold tabular-nums', t.projected < 0 ? 'text-expense' : 'text-primary-700')}>≈ {money(t.projected)}</p>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              {t.recurringIn > 0 && <><span className="text-income">+{money(t.recurringIn)}</span> recurring income · </>}
              <span className="text-expense">−{money(t.recurringOut)}</span> recurring bills ·{' '}
              <span className="text-expense">−{money(t.expectedSpending)}</span> usual spending
            </p>
            <ul className="mt-2.5 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {counted.map((w) => (
                <li key={w.walletId} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                  <Link to={`/wallet/${w.walletId}`} className="min-w-0 flex-1 truncate font-medium text-ink hover:text-primary-700">{w.name}</Link>
                  <span className="w-24 text-right tabular-nums text-ink-muted">{money(w.current)}</span>
                  <ArrowRight size={11} className="shrink-0 text-ink-muted" />
                  <span className={cn('w-24 text-right font-semibold tabular-nums', w.projected < 0 ? 'text-expense' : 'text-ink')}>{money(w.projected)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Heads up */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink">Heads up</p>
            {alerts.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg bg-income-light px-3 py-2.5 text-xs text-income">
                <CheckCircle2 size={15} className="mt-px shrink-0" />
                <span>All good — every wallet stays above zero and your budgets last the month at this pace.</span>
              </div>
            ) : (
              <ul className="max-h-[188px] space-y-1.5 overflow-y-auto pr-1">
                {alerts.map((a) => (
                  <li key={a.title}>
                    <Link
                      to={a.to}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
                        a.tone === 'danger' ? 'bg-expense-light hover:bg-expense-light/70' : 'bg-orange-50 hover:bg-orange-100',
                      )}
                    >
                      {a.tone === 'danger'
                        ? <AlertTriangle size={14} className="mt-px shrink-0 text-expense" />
                        : <TrendingDown size={14} className="mt-px shrink-0 text-orange-600" />}
                      <span className="min-w-0">
                        <span className={cn('block font-semibold', a.tone === 'danger' ? 'text-expense' : 'text-orange-700')}>{a.title}</span>
                        {a.detail && <span className="block text-ink-muted">{a.detail}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
