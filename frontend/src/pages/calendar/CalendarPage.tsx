import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  getDaysInMonth,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, PiggyBank, Flame, CalendarDays, ArrowLeftRight, Eye, EyeOff,
} from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { transactionService } from '@/services/transaction.service';
import { Transaction } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { usePrivacy, MASK } from '@/lib/use-privacy';
import { StatCard, HideAllButton } from '@/components/shared/StatCard';
import { TransactionItem } from '@/pages/transactions/components/TransactionItem';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';

type DayData = { income: number; expense: number; transfers: number; txs: Transaction[] };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIVACY_KEYS = ['income', 'expense', 'net', 'avg', 'days'] as const;

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

function buildDayMap(txs: Transaction[]): Map<string, DayData> {
  const map = new Map<string, DayData>();
  for (const tx of txs) {
    const key = tx.date.substring(0, 10);
    if (!map.has(key)) map.set(key, { income: 0, expense: 0, transfers: 0, txs: [] });
    const d = map.get(key)!;
    if (tx.type === 'INCOME') d.income += Number(tx.amount);
    else if (tx.type === 'EXPENSE') d.expense += Number(tx.amount);
    else d.transfers += 1;
    d.txs.push(tx);
  }
  return map;
}

/** 12500 → "12.5k", 1250000 → "1.25M" — fits in a calendar cell. */
function short(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

export function CalendarPage() {
  const queryClient = useQueryClient();
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const currency = activeAccount?.currency ?? 'Rs.';
  const accountId = activeAccount?.id;
  const privacy = usePrivacy('mm_cal_hidden', PRIVACY_KEYS);
  const hideDays = privacy.isHidden('days');

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const monthInput = useRef<HTMLInputElement>(null);

  const startDate = format(month, 'yyyy-MM-dd');
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-transactions', accountId, startDate, endDate],
    queryFn: () => transactionService.list({ accountId: accountId!, startDate, endDate, limit: 1000, page: 1 }),
    enabled: !!accountId,
  });

  const transactions = useMemo(() => data?.data ?? [], [data]);
  const dayMap = useMemo(() => buildDayMap(transactions), [transactions]);

  const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expense;
  const daysElapsed = isSameMonth(month, new Date()) ? new Date().getDate() : getDaysInMonth(month);
  const avgDaily = daysElapsed > 0 ? expense / daysElapsed : 0;
  const maxDayExpense = Math.max(0, ...[...dayMap.values()].map((d) => d.expense));
  const topDays = [...dayMap.entries()]
    .filter(([, d]) => d.expense > 0)
    .sort((a, b) => b[1].expense - a[1].expense)
    .slice(0, 3);

  const calDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const weeks: Date[][] = [];
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7));

  const selected = dayMap.get(dayKey(selectedDay));
  const money = (n: number) => formatCurrency(n, currency);

  function goMonth(next: Date) {
    const m = startOfMonth(next);
    setMonth(m);
    setSelectedDay(isSameMonth(m, new Date()) ? new Date() : m);
  }

  const onModalClose = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
    queryClient.invalidateQueries({ queryKey: ['calendar-transactions', accountId] });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-3 p-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-line bg-surface shadow-sm">
            <button onClick={() => goMonth(subMonths(month, 1))} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-l-xl text-ink-muted hover:bg-gray-50">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => monthInput.current?.showPicker?.()}
              className="relative flex h-9 min-w-[150px] items-center justify-center gap-1.5 border-x border-line px-3 text-sm font-bold text-ink hover:bg-gray-50"
              title="Pick a month"
            >
              <CalendarDays size={15} className="text-ink-muted" />
              {format(month, 'MMMM yyyy')}
              <input
                ref={monthInput}
                type="month"
                value={format(month, 'yyyy-MM')}
                onChange={(e) => e.target.value && goMonth(parseISO(`${e.target.value}-01`))}
                className="pointer-events-none absolute inset-0 opacity-0"
                tabIndex={-1}
                aria-hidden
              />
            </button>
            <button onClick={() => goMonth(addMonths(month, 1))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-r-xl text-ink-muted hover:bg-gray-50">
              <ChevronRight size={18} />
            </button>
          </div>
          {!isSameMonth(month, new Date()) && (
            <button onClick={() => goMonth(new Date())} className="h-9 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink shadow-sm hover:bg-gray-50">
              Today
            </button>
          )}
          <div className="ml-auto flex items-center gap-3 text-[11px] text-ink-muted">
            <span className="hidden items-center gap-1 sm:flex"><span className="h-2 w-2 rounded-full bg-income" /> Income</span>
            <span className="hidden items-center gap-1 sm:flex"><span className="h-2 w-2 rounded-full bg-expense" /> Expense</span>
            <span className="hidden items-center gap-1 md:flex"><span className="h-3 w-3 rounded bg-expense/25" /> Darker = spent more</span>
            <HideAllButton allHidden={privacy.allHidden} onClick={privacy.toggleAll} />
          </div>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Income" icon={TrendingUp} tone="income" value={money(income)} sub={format(month, 'MMMM')} loading={isLoading}
            hidden={privacy.isHidden('income')} onToggleHidden={() => privacy.toggle('income')} />
          <StatCard label="Expense" icon={TrendingDown} tone="expense" value={money(expense)} sub={`${transactions.filter((t) => t.type === 'EXPENSE').length} payments`} loading={isLoading}
            hidden={privacy.isHidden('expense')} onToggleHidden={() => privacy.toggle('expense')} />
          <StatCard label="Net" icon={PiggyBank} tone={net >= 0 ? 'income' : 'expense'} value={money(net)} sub={net >= 0 ? 'Saved this month' : 'Spent more than earned'} loading={isLoading}
            hidden={privacy.isHidden('net')} onToggleHidden={() => privacy.toggle('net')} />
          <StatCard label="Daily average spend" icon={Flame} tone="warning" value={money(Math.round(avgDaily))} sub={`Over ${daysElapsed} day${daysElapsed === 1 ? '' : 's'}`} loading={isLoading}
            hidden={privacy.isHidden('avg')} onToggleHidden={() => privacy.toggle('avg')} />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Calendar */}
          <div className="card lg:self-start">
            <div className="grid grid-cols-7 border-b border-line bg-gray-50/60 md:grid-cols-[repeat(7,minmax(0,1fr))_88px]">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={cn('py-2 text-center text-[11px] font-semibold uppercase tracking-wide', i === 0 || i === 6 ? 'text-ink-muted/70' : 'text-ink-muted')}>
                  {d}
                </div>
              ))}
              <div className="hidden py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted md:block">Week</div>
            </div>

            <div className={cn('transition-opacity', isLoading && 'opacity-50')}>
              {weeks.map((week) => {
                const wk = week.reduce(
                  (t, d) => {
                    if (!isSameMonth(d, month)) return t;
                    const dd = dayMap.get(dayKey(d));
                    return { income: t.income + (dd?.income ?? 0), expense: t.expense + (dd?.expense ?? 0) };
                  },
                  { income: 0, expense: 0 },
                );
                return (
                  <div key={dayKey(week[0])} className="grid grid-cols-7 border-b border-line last:border-b-0 md:grid-cols-[repeat(7,minmax(0,1fr))_88px]">
                    {week.map((day) => {
                      const dd = dayMap.get(dayKey(day));
                      const inMonth = isSameMonth(day, month);
                      const sel = isSameDay(day, selectedDay);
                      const today = isToday(day);
                      const heat = inMonth && dd && maxDayExpense > 0 ? dd.expense / maxDayExpense : 0;
                      return (
                        <button
                          key={dayKey(day)}
                          onClick={() => setSelectedDay(day)}
                          onDoubleClick={() => setAddingDate(dayKey(day))}
                          title={inMonth ? `${format(day, 'EEEE d MMMM')} — double-click to add` : undefined}
                          className={cn(
                            'relative flex h-[68px] min-w-0 flex-col border-r border-line p-1.5 text-left transition-colors last:border-r-0 sm:h-[84px] md:[&:nth-child(7)]:border-r',
                            !inMonth && 'bg-gray-50/50',
                            sel ? 'z-[1] ring-2 ring-inset ring-primary-500' : 'hover:bg-primary-50/40',
                          )}
                          style={heat > 0 && !hideDays ? { backgroundColor: `rgb(var(--c-expense) / ${(0.03 + heat * 0.14).toFixed(3)})` } : undefined}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold',
                                today ? 'bg-primary-600 text-white' : inMonth ? 'text-ink' : 'text-ink-muted/50',
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {inMonth && dd && dd.txs.length > 0 && (
                              <span className="hidden text-[10px] text-ink-muted sm:inline">{dd.txs.length}×</span>
                            )}
                          </div>
                          {inMonth && dd && (
                            <div className="mt-auto space-y-0.5 text-right text-[10px] font-semibold leading-tight tabular-nums sm:text-[11px]">
                              {dd.income > 0 && <p className="truncate text-income">{hideDays ? '•••' : `+${short(dd.income)}`}</p>}
                              {dd.expense > 0 && <p className="truncate text-expense">{hideDays ? '•••' : `−${short(dd.expense)}`}</p>}
                              {dd.income === 0 && dd.expense === 0 && dd.transfers > 0 && (
                                <p className="flex items-center justify-end gap-0.5 text-ink-muted"><ArrowLeftRight size={10} />{dd.transfers}</p>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                    <div className="hidden flex-col justify-center border-l border-line bg-gray-50/60 px-2 text-right text-[11px] font-semibold tabular-nums md:flex">
                      {wk.income > 0 && <p className="text-income">{hideDays ? '•••' : `+${short(wk.income)}`}</p>}
                      {wk.expense > 0 && <p className="text-expense">{hideDays ? '•••' : `−${short(wk.expense)}`}</p>}
                      {wk.income === 0 && wk.expense === 0 && <p className="text-ink-muted/50">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-ink-muted">
              <span>Tap a day to see it · double-click to add</span>
              <button onClick={() => privacy.toggle('days')} className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 hover:bg-gray-100 hover:text-ink">
                {hideDays ? <EyeOff size={12} /> : <Eye size={12} />} {hideDays ? 'Show day amounts' : 'Hide day amounts'}
              </button>
            </div>
          </div>

          {/* Day panel */}
          <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="card flex flex-col lg:max-h-[calc(100vh-220px)]">
              <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-muted">{isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE')}</p>
                  <p className="text-base font-bold text-ink">{format(selectedDay, 'd MMMM yyyy')}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-semibold tabular-nums">
                    {selected && selected.income > 0 && <span className="text-income">+{hideDays ? MASK : money(selected.income)}</span>}
                    {selected && selected.expense > 0 && <span className="text-expense">−{hideDays ? MASK : money(selected.expense)}</span>}
                    {!selected && <span className="font-normal text-ink-muted">No transactions</span>}
                  </div>
                </div>
                <button
                  onClick={() => setAddingDate(dayKey(selectedDay))}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-white shadow-sm active:scale-95"
                  style={{ background: 'rgb(var(--c-brand-600))' }}
                >
                  <Plus size={13} /> Add
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {!selected || selected.txs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-sm text-ink-muted">Nothing recorded on this day.</p>
                    <button onClick={() => setAddingDate(dayKey(selectedDay))} className="text-sm font-semibold text-primary-600 hover:underline">
                      Add a transaction
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {selected.txs.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} currency={currency} hideAmount={hideDays} onClick={() => setEditingTx(tx)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {topDays.length > 0 && (
              <div className="card p-3">
                <p className="mb-1.5 text-xs font-semibold text-ink">Biggest spending days</p>
                <div className="space-y-1">
                  {topDays.map(([key, d], i) => (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(parseISO(key))}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-gray-50"
                    >
                      <span className="w-4 text-center font-bold text-ink-muted">{i + 1}</span>
                      <span className="flex-1 text-ink">{format(parseISO(key), 'EEE d MMM')}</span>
                      <span className="text-ink-muted">{d.txs.length} tx</span>
                      <span className="w-24 text-right font-semibold tabular-nums text-expense">{hideDays ? MASK : money(d.expense)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {addingDate && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          defaultDate={addingDate}
          onClose={() => { setAddingDate(null); onModalClose(); }}
        />
      )}
      {editingTx && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          editing={editingTx}
          onClose={() => { setEditingTx(null); onModalClose(); }}
        />
      )}
    </div>
  );
}
