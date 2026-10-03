import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, Play, Pencil, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { recurringService } from '@/services/recurring.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionType, RecurringFrequency, Recurring } from '@/types';
import { addDays, startOfDay, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import { StatCard, SectionBar, AddButton } from '@/components/shared/StatCard';
import { RecurringFormModal, scheduleLabel, formatTime } from './RecurringFormModal';

// How many times a frequency happens in an average month
const PER_MONTH: Record<RecurringFrequency, number> = { DAILY: 30.4, WEEKLY: 52 / 12, MONTHLY: 1, YEARLY: 1 / 12, CUSTOM: 1 };

export function RecurringTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmExecute, setConfirmExecute] = useState<number | null>(null);

  const { data: recurrings = [], isLoading } = useQuery({
    queryKey: ['recurrings', accountId],
    queryFn: () => recurringService.getAll(accountId!),
    enabled: !!accountId,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', accountId],
    queryFn: () => categoryService.list(accountId!),
    enabled: !!accountId,
  });

  const executeMutation = useMutation({
    mutationFn: (id: number) => recurringService.execute(id),
    onSuccess: () => {
      toast.success('Transaction created');
      qc.invalidateQueries({ queryKey: ['recurrings', accountId] });
      qc.invalidateQueries({ queryKey: ['wallets', accountId] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setConfirmExecute(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recurringService.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['recurrings', accountId] });
      setConfirmDelete(null);
    },
  });

  if (!accountId) return null;

  return (
    <div className="space-y-3">
      <SectionBar title="Recurring" meta={recurrings.length ? `${recurrings.length} repeating transaction${recurrings.length === 1 ? '' : 's'} · added to your transactions automatically on each date` : 'Bills, salary and subscriptions that repeat'}>
        <AddButton label="Add recurring" onClick={() => setShowCreate(true)} />
      </SectionBar>

      {recurrings.length > 0 && <RecurringSummary items={recurrings} currency={currency} />}

      {(showCreate || editing) && (
        <RecurringFormModal
          accountId={accountId}
          wallets={wallets}
          categories={categories}
          editing={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="card space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : recurrings.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-sm text-gray-400">No recurring transactions</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Add your first one
          </button>
        </div>
      ) : (
        <ul className="card divide-y divide-gray-100">
          {[...recurrings].sort((x, y) => x.nextOccurrence.localeCompare(y.nextOccurrence)).map((r) => {
            const isIncome = r.transactionType === 'INCOME';
            const isTransfer = r.transactionType === 'TRANSFER';
            const tone = isIncome ? 'text-income' : isTransfer ? 'text-blue-600' : 'text-expense';
            const Icon = isIncome ? ArrowDownLeft : isTransfer ? ArrowLeftRight : ArrowUpRight;
            const days = differenceInCalendarDays(new Date(r.nextOccurrence), new Date());
            const walletName = (id: number | null) => (id ? wallets.find((w) => w.id === id)?.name : undefined);
            const via = isTransfer
              ? [walletName(r.fromWalletId), walletName(r.toWalletId)].filter(Boolean).join(' → ')
              : walletName(r.walletId);
            return (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span
                  className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', !r.category?.color && (isIncome ? 'bg-income-light' : isTransfer ? 'bg-blue-50' : 'bg-expense-light'))}
                  style={r.category?.color ? { backgroundColor: r.category.color } : undefined}
                >
                  <Icon size={16} className={r.category?.color ? 'text-white' : tone} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.description || r.category?.name || 'Recurring'}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {scheduleLabel(r)}
                    {r.time ? ` · ${formatTime(r.time)}` : ''}
                    {r.category?.name && r.description ? ` · ${r.category.name}` : ''}
                    {via ? ` · ${via}` : ''}
                  </p>
                </div>
                <div className="hidden w-28 shrink-0 text-right sm:block">
                  <p className={cn('text-xs font-semibold', days < 0 ? 'text-expense' : days <= 3 ? 'text-orange-600' : 'text-ink')}>
                    {days < 0 ? `Overdue ${-days}d` : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                  </p>
                  <p className="text-[11px] text-ink-muted">{format(new Date(r.nextOccurrence), 'd MMM yyyy')}{r.time ? `, ${formatTime(r.time)}` : ''}</p>
                </div>
                <p className={cn('w-28 shrink-0 text-right text-sm font-bold tabular-nums', tone)}>
                  {isIncome ? '+' : isTransfer ? '' : '−'}{formatCurrency(Number(r.amount), currency)}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(r)}
                    title="Edit"
                    className="flex h-7 items-center rounded-lg px-1.5 text-ink-muted/70 transition-colors hover:bg-gray-100 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => confirmExecute === r.id ? executeMutation.mutate(r.id) : setConfirmExecute(r.id)}
                    title="Add the next one now, before its date (it's added automatically on the day anyway)"
                    className={cn(
                      'flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95',
                      confirmExecute === r.id ? 'bg-green-600 text-white' : 'border border-line text-ink-muted hover:bg-gray-50 hover:text-ink',
                    )}
                  >
                    <Play size={11} /> {confirmExecute === r.id ? 'Add now?' : 'Add early'}
                  </button>
                  <button
                    onClick={() => confirmDelete === r.id ? deleteMutation.mutate(r.id) : setConfirmDelete(r.id)}
                    title={confirmDelete === r.id ? 'Tap again to delete' : 'Delete'}
                    className={cn(
                      'flex h-7 items-center rounded-lg px-1.5 text-xs transition-colors',
                      confirmDelete === r.id ? 'bg-red-500 font-semibold text-white' : 'text-ink-muted/60 hover:bg-red-50 hover:text-red-500',
                    )}
                  >
                    {confirmDelete === r.id ? 'Delete?' : <Trash2 size={13} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecurringSummary({ items, currency }: { items: Recurring[]; currency: string }) {
  // Count the real dates in this calendar month (October has 5 Thursdays, not "4.33")
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonth = (type: TransactionType) =>
    items.filter((r) => r.transactionType === type).reduce((t, r) => t + Number(r.amount) * occurrencesIn(r, monthStart, monthEnd), 0);
  // Long-run average, for the hint line
  const average = (type: TransactionType) =>
    items.filter((r) => r.transactionType === type).reduce((t, r) => t + Number(r.amount) * timesPerMonth(r), 0);
  const inflow = thisMonth('INCOME');
  const outflow = thisMonth('EXPENSE');
  const whole = (n: number) => formatCurrency(Math.round(n), currency);
  const month = format(now, 'MMMM');
  const next = [...items].sort((a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence))[0];
  const weekStart = addDays(startOfDay(now), 1);
  const weekEnd = addDays(startOfDay(now), 7);
  const upcoming = items.filter((r) => r.transactionType === 'EXPENSE').reduce((t, r) => t + Number(r.amount) * occurrencesIn(r, weekStart, weekEnd), 0);
  const upcomingCount = items.reduce((t, r) => t + occurrencesIn(r, weekStart, weekEnd), 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label={`Recurring income in ${month}`} tone="income" value={whole(inflow)} sub={`About ${whole(average('INCOME'))} in an average month`} />
      <StatCard label={`Recurring bills in ${month}`} tone="expense" value={whole(outflow)} sub={`About ${whole(average('EXPENSE'))} in an average month`} />
      <StatCard label="Bills in the next 7 days" tone={upcoming ? 'warning' : 'neutral'} value={whole(upcoming)} sub={upcomingCount ? `${upcomingCount} entr${upcomingCount === 1 ? 'y' : 'ies'} will be added automatically` : 'Nothing scheduled'} />
      <StatCard label="Next up" tone="brand" value={next ? format(new Date(next.nextOccurrence), 'EEE d MMM') : '—'} sub={next ? (next.description || next.category?.name || scheduleLabel(next)) : ''} />
    </div>
  );
}

function timesPerMonth(r: Recurring): number {
  if (r.frequency === 'WEEKLY' && r.weekdays?.length) return (r.weekdays.length * 52) / 12;
  return PER_MONTH[r.frequency] ?? 1;
}

/** How many times `r` falls between `from` and `to` (inclusive), within its start/end dates. */
function occurrencesIn(r: Recurring, from: Date, to: Date): number {
  const start = parseISO(r.startDate.slice(0, 10));
  const end = r.endDate ? parseISO(r.endDate.slice(0, 10)) : null;
  // Monthly/yearly repeat on the start date's day — or the month's last day if shorter (e.g. the 31st)
  const sameDayOfMonth = (d: Date) => d.getDate() === Math.min(start.getDate(), getDaysInMonth(d));
  const matches = (d: Date): boolean => {
    switch (r.frequency) {
      case 'DAILY':
        return true;
      case 'WEEKLY':
        return r.weekdays?.length ? r.weekdays.includes(d.getDay()) : d.getDay() === start.getDay();
      case 'YEARLY':
        return d.getMonth() === start.getMonth() && sameDayOfMonth(d);
      default:
        return sameDayOfMonth(d);
    }
  };
  return eachDayOfInterval({ start: from, end: to }).filter((d) => d >= start && (!end || d <= end) && matches(d)).length;
}