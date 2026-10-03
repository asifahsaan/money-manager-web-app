import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { X, Trash2, AlertTriangle, CalendarDays } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { budgetService } from '@/services/budget.service';
import { categoryService } from '@/services/category.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Budget, PeriodType } from '@/types';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { resolveIcon } from '@/lib/category-icons';
import { StatCard, SectionBar, AddButton } from '@/components/shared/StatCard';

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const schema = z.object({
  categoryId: z.string().min(1, 'Category required'),
  amount: z.string().min(1).refine((v) => Number(v) > 0, 'Must be > 0'),
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

const today = format(new Date(), 'yyyy-MM-dd');
const monthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd');

export function BudgetTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', accountId],
    queryFn: () => budgetService.getAll(accountId!),
    enabled: !!accountId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', accountId],
    queryFn: () => categoryService.list(accountId!),
    enabled: !!accountId,
  });

  const expenseCategories = categories
    .filter((c) => c.type === 'EXPENSE')
    .flatMap((c) => [c, ...(c.children ?? [])]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { periodType: 'MONTHLY', startDate: today, endDate: monthEnd },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      budgetService.create({
        accountId: accountId!,
        categoryId: Number(data.categoryId),
        amount: Number(data.amount),
        periodType: data.periodType as PeriodType,
        startDate: data.startDate,
        endDate: data.endDate,
      }),
    onSuccess: () => {
      toast.success('Budget created');
      qc.invalidateQueries({ queryKey: ['budgets', accountId] });
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('Failed to create budget'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetService.delete(id),
    onSuccess: () => {
      toast.success('Budget deleted');
      qc.invalidateQueries({ queryKey: ['budgets', accountId] });
      setConfirmDelete(null);
    },
  });

  if (!accountId) return null;

  return (
    <div className="space-y-3">
      <SectionBar
        title="Budgets"
        meta={budgets.length ? `${budgets.length} active · spending limits per category` : 'Set a spending limit per category'}
      >
        <AddButton label="Add budget" onClick={() => setShowForm(true)} />
      </SectionBar>

      {budgets.length > 0 && <BudgetSummary budgets={budgets} currency={currency} />}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">New Budget</span>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <select {...register('categoryId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select category</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.parentCategoryId ? '  └ ' : ''}{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-expense text-xs mt-1">{errors.categoryId.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                <input type="number" step="0.01" {...register('amount')} placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errors.amount && <p className="text-expense text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Period</label>
                <select {...register('periodType')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" {...register('startDate')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input type="date" {...register('endDate')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {createMutation.isPending ? 'Saving…' : 'Save Budget'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[124px]" />)}</div>
      ) : budgets.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-sm text-gray-400">No budgets yet</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[...budgets].sort((x, y) => y.percentage - x.percentage).map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              currency={currency}
              onDelete={() => confirmDelete === b.id ? deleteMutation.mutate(b.id) : setConfirmDelete(b.id)}
              deleteLabel={confirmDelete === b.id ? 'Confirm?' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetSummary({ budgets, currency }: { budgets: Budget[]; currency: string }) {
  const limit = budgets.reduce((t, b) => t + Number(b.amount), 0);
  const spent = budgets.reduce((t, b) => t + b.spent, 0);
  const over = budgets.filter((b) => b.percentage >= 100).length;
  const near = budgets.filter((b) => b.percentage >= 80 && b.percentage < 100).length;
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Total limit" value={formatCurrency(limit, currency)} sub={`${budgets.length} budget${budgets.length === 1 ? '' : 's'}`} />
      <StatCard label="Spent" tone="expense" value={formatCurrency(spent, currency)} sub={`${pct.toFixed(2)}% of limit`} />
      <StatCard label="Left to spend" tone={limit - spent >= 0 ? 'income' : 'expense'} value={formatCurrency(limit - spent, currency)} sub={limit - spent >= 0 ? 'Across all budgets' : 'Over the total limit'} />
      <StatCard label="Needs attention" tone={over ? 'expense' : near ? 'warning' : 'neutral'} value={String(over + near)} sub={over ? `${over} over limit${near ? ` · ${near} near` : ''}` : near ? `${near} above 80%` : 'All within limit'} />
    </div>
  );
}

function BudgetCard({ budget: b, currency, onDelete, deleteLabel }: {
  budget: Budget;
  currency: string;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const pct = b.percentage;
  const limit = Number(b.amount);
  const left = limit - b.spent;
  const Icon = resolveIcon(b.category.icon);
  const color = b.category.color ?? '#6366F1';
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  const daysLeft = differenceInCalendarDays(parseISO(b.endDate.substring(0, 10)), new Date()) + 1;
  const perDay = daysLeft > 0 && left > 0 ? left / daysLeft : 0;

  return (
    <div className="card flex h-[124px] flex-col p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: color }}>
          <Icon size={15} color="white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{b.category.name}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-ink-muted">
            <CalendarDays size={11} />
            {format(parseISO(b.startDate.substring(0, 10)), 'd MMM')} – {format(parseISO(b.endDate.substring(0, 10)), 'd MMM')}
            {daysLeft > 0 ? ` · ${daysLeft}d left` : ' · ended'}
          </p>
        </div>
        <button
          onClick={onDelete}
          title="Delete budget"
          className={cn(
            'shrink-0 rounded-lg px-1.5 py-1 text-xs font-medium transition-colors',
            deleteLabel ? 'bg-red-500 text-white' : 'text-ink-muted/60 hover:bg-red-50 hover:text-red-500',
          )}
        >
          {deleteLabel ?? <Trash2 size={13} />}
        </button>
      </div>

      <div className="mt-auto">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs tabular-nums">
          <span className="text-ink">
            <b className="font-bold">{formatCurrency(b.spent, currency)}</b>
            <span className="text-ink-muted"> of {formatCurrency(limit, currency)}</span>
          </span>
          <span className="font-semibold" style={{ color: barColor }}>{pct.toFixed(2)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
        </div>
        <p className={cn('mt-1 flex items-center gap-1 truncate text-[11px]', left < 0 ? 'font-semibold text-expense' : 'text-ink-muted')}>
          {left < 0 ? (
            <><AlertTriangle size={11} /> Over by {formatCurrency(-left, currency)}</>
          ) : (
            <>{formatCurrency(left, currency)} left{perDay > 0 && ` · about ${formatCurrency(Math.floor(perDay), currency)}/day`}</>
          )}
        </p>
      </div>
    </div>
  );
}
