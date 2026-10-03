import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Trash2, X, Play, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { recurringService } from '@/services/recurring.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
// walletService kept for the create form wallet selector
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionType, RecurringFrequency, Recurring } from '@/types';
import { differenceInCalendarDays, format } from 'date-fns';
import { StatCard, SectionBar, AddButton } from '@/components/shared/StatCard';

// How many times a frequency happens in an average month
const PER_MONTH: Record<RecurringFrequency, number> = { DAILY: 30.4, WEEKLY: 52 / 12, MONTHLY: 1, YEARLY: 1 / 12, CUSTOM: 1 };

const today = format(new Date(), 'yyyy-MM-dd');

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const TX_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
];

const schema = z.object({
  transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.string().refine((v) => Number(v) > 0),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  fromWalletId: z.string().optional(),
  toWalletId: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function RecurringTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
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

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { transactionType: 'EXPENSE', frequency: 'MONTHLY', startDate: today },
  });

  const txType = watch('transactionType');

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      recurringService.create({
        accountId: accountId!,
        transactionType: data.transactionType as TransactionType,
        amount: Number(data.amount),
        description: data.description,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        walletId: data.walletId ? Number(data.walletId) : undefined,
        fromWalletId: data.fromWalletId ? Number(data.fromWalletId) : undefined,
        toWalletId: data.toWalletId ? Number(data.toWalletId) : undefined,
        frequency: data.frequency as RecurringFrequency,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
      }),
    onSuccess: () => {
      toast.success('Recurring created');
      qc.invalidateQueries({ queryKey: ['recurrings', accountId] });
      setShowCreate(false);
      reset();
    },
    onError: () => toast.error('Failed'),
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

  const allCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);

  if (!accountId) return null;

  return (
    <div className="space-y-3">
      <SectionBar title="Recurring" meta={recurrings.length ? `${recurrings.length} repeating transaction${recurrings.length === 1 ? '' : 's'} · run them when they're due` : 'Bills, salary and subscriptions that repeat'}>
        <AddButton label="Add recurring" onClick={() => setShowCreate(true)} />
      </SectionBar>

      {recurrings.length > 0 && <RecurringSummary items={recurrings} currency={currency} />}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">New Recurring</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {TX_TYPES.map((t) => (
                    <label key={t.value} className={cn(
                      'flex items-center justify-center py-2 rounded-xl border-2 text-xs cursor-pointer transition-colors',
                      txType === t.value ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold' : 'border-gray-200 text-gray-500',
                    )}>
                      <input type="radio" value={t.value} {...register('transactionType')} className="hidden" />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <input type="number" step="0.01" {...register('amount')} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  {errors.amount && <p className="text-expense text-xs">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                  <select {...register('frequency')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                    {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <input {...register('description')} placeholder="e.g. Netflix subscription"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              {txType !== 'TRANSFER' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Wallet</label>
                    <select {...register('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                      <option value="">Select wallet</option>
                      {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Category (optional)</label>
                    <select {...register('categoryId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                      <option value="">No category</option>
                      {allCategories.filter((c) => c.type === (txType === 'INCOME' ? 'INCOME' : 'EXPENSE')).map((c) => (
                        <option key={c.id} value={c.id}>{c.parentCategoryId ? '  └ ' : ''}{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {txType === 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From Wallet</label>
                    <select {...register('fromWalletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                      <option value="">Select</option>
                      {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To Wallet</label>
                    <select {...register('toWalletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                      <option value="">Select</option>
                      {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" {...register('startDate')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
                  <input type="date" {...register('endDate')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {createMutation.isPending ? 'Saving…' : 'Create Recurring'}
              </button>
            </form>
          </div>
        </div>
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
                    <span className="capitalize">{r.frequency.toLowerCase()}</span>
                    {r.category?.name && r.description ? ` · ${r.category.name}` : ''}
                    {via ? ` · ${via}` : ''}
                  </p>
                </div>
                <div className="hidden w-28 shrink-0 text-right sm:block">
                  <p className={cn('text-xs font-semibold', days < 0 ? 'text-expense' : days <= 3 ? 'text-orange-600' : 'text-ink')}>
                    {days < 0 ? `Overdue ${-days}d` : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                  </p>
                  <p className="text-[11px] text-ink-muted">{format(new Date(r.nextOccurrence), 'd MMM yyyy')}</p>
                </div>
                <p className={cn('w-28 shrink-0 text-right text-sm font-bold tabular-nums', tone)}>
                  {isIncome ? '+' : isTransfer ? '' : '−'}{formatCurrency(Number(r.amount), currency)}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => confirmExecute === r.id ? executeMutation.mutate(r.id) : setConfirmExecute(r.id)}
                    title="Add this transaction now"
                    className={cn(
                      'flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95',
                      confirmExecute === r.id ? 'bg-green-600 text-white' : 'border border-line text-ink-muted hover:bg-gray-50 hover:text-ink',
                    )}
                  >
                    <Play size={11} /> {confirmExecute === r.id ? 'Confirm' : 'Run'}
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
  const monthly = (type: TransactionType) =>
    items.filter((r) => r.transactionType === type).reduce((t, r) => t + Number(r.amount) * (PER_MONTH[r.frequency] ?? 1), 0);
  const inflow = monthly('INCOME');
  const outflow = monthly('EXPENSE');
  const next = [...items].sort((a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence))[0];
  const dueNow = items.filter((r) => differenceInCalendarDays(new Date(r.nextOccurrence), new Date()) <= 0).length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Monthly income" tone="income" value={formatCurrency(inflow, currency)} sub="Recurring, per month" />
      <StatCard label="Monthly bills" tone="expense" value={formatCurrency(outflow, currency)} sub="Recurring, per month" />
      <StatCard label="Due now" tone={dueNow ? 'warning' : 'neutral'} value={String(dueNow)} sub={dueNow ? 'Tap Run to add them' : 'Nothing waiting'} />
      <StatCard label="Next up" tone="brand" value={next ? format(new Date(next.nextOccurrence), 'd MMM') : '—'} sub={next ? (next.description || next.category?.name || next.frequency.toLowerCase()) : ''} />
    </div>
  );
}
