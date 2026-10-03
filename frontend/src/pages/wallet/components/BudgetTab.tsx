import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { X, Trash2, AlertTriangle, CalendarDays, Pencil } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { budgetService } from '@/services/budget.service';
import { categoryService } from '@/services/category.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Budget, PeriodType } from '@/types';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { resolveIcon } from '@/lib/category-icons';
import { StatCard, SectionBar, AddButton } from '@/components/shared/StatCard';
import { CategoryCombobox } from '@/components/shared/CategoryCombobox';
import { WeekdayPicker, weekdaysLabel, countWeekdays } from '@/components/shared/WeekdayPicker';
import { budgetPace, paceDay } from '@/lib/budget-pace';

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
  const [editing, setEditing] = useState<Budget | null>(null);
  // Spending days for the per-day allowance; all seven = every day
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
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

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { periodType: 'MONTHLY', startDate: today, endDate: monthEnd },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const activeWeekdays = days.length === 7 ? [] : [...days].sort((a, b) => a - b);
      return editing
        ? budgetService.update(editing.id, { amount: Number(data.amount), startDate: data.startDate, endDate: data.endDate, activeWeekdays })
        : budgetService.create({
            accountId: accountId!,
            categoryId: Number(data.categoryId),
            amount: Number(data.amount),
            periodType: data.periodType as PeriodType,
            startDate: data.startDate,
            endDate: data.endDate,
            activeWeekdays,
          });
    },
    onSuccess: () => {
      toast.success(editing ? 'Budget updated' : 'Budget created');
      qc.invalidateQueries({ queryKey: ['budgets'] });
      closeForm();
    },
    onError: () => toast.error(editing ? 'Failed to update budget' : 'Failed to create budget'),
  });

  function openAdd() {
    setEditing(null);
    setDays([0, 1, 2, 3, 4, 5, 6]);
    reset({ periodType: 'MONTHLY', startDate: today, endDate: monthEnd, categoryId: '', amount: '' });
    setShowForm(true);
  }
  function openEdit(b: Budget) {
    setEditing(b);
    setDays(b.activeWeekdays?.length ? b.activeWeekdays : [0, 1, 2, 3, 4, 5, 6]);
    reset({
      categoryId: String(b.categoryId),
      amount: String(Number(b.amount)),
      periodType: b.periodType,
      startDate: b.startDate.substring(0, 10),
      endDate: b.endDate.substring(0, 10),
    });
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

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
        <AddButton label="Add budget" onClick={() => openAdd()} />
      </SectionBar>

      {budgets.length > 0 && <BudgetSummary budgets={budgets} currency={currency} />}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">{editing ? `Edit budget — ${editing.category.name}` : 'New Budget'}</span>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                {editing ? (
                  <p className="flex h-10 items-center rounded-xl border border-line bg-gray-50 px-3 text-sm text-ink-muted">{editing.category.name}</p>
                ) : (
                <CategoryCombobox
                  categories={categories}
                  type="EXPENSE"
                  value={watch('categoryId') ? Number(watch('categoryId')) : ''}
                  onChange={(id) => setValue('categoryId', id ? String(id) : '', { shouldValidate: true })}
                  emptyLabel=""
                  placeholder="Search or pick a category"
                  invalid={!!errors.categoryId}
                />
                )}
                {errors.categoryId && <p className="text-expense text-xs mt-1">{errors.categoryId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <input type="number" step="0.01" {...register('amount')} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  {errors.amount && <p className="text-expense text-xs mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Period</label>
                  <select {...register('periodType')} disabled={!!editing} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white disabled:bg-gray-50">
                    {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
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
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Spending days <span className="text-gray-400">— {weekdaysLabel(days.length === 7 ? [] : days)}</span>
                </label>
                <WeekdayPicker value={days} onChange={setDays} />
                <p className="mt-1 text-[11px] text-gray-400">
                  The daily allowance is worked out over these days only — e.g. transport Mon–Fri skips weekends.
                </p>
              </div>
              <button type="submit" disabled={createMutation.isPending || days.length === 0}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {createMutation.isPending ? 'Saving…' : days.length === 0 ? 'Pick at least one day' : editing ? 'Save changes' : 'Save Budget'}
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
          <button onClick={() => openAdd()} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
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
              onEdit={() => openEdit(b)}
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

function BudgetCard({ budget: b, currency, onEdit, onDelete, deleteLabel }: {
  budget: Budget;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const pct = b.percentage;
  const limit = Number(b.amount);
  const left = limit - b.spent;
  const Icon = resolveIcon(b.category.icon);
  const color = b.category.color ?? '#6366F1';
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  const end = parseISO(b.endDate.substring(0, 10));
  const daysLeft = differenceInCalendarDays(end, new Date()) + 1;
  // Per-day allowance only over the days this money is actually spent (e.g. Mon–Fri)
  const spendDays = b.activeWeekdays ?? [];
  const spendDaysLeft = daysLeft > 0 ? countWeekdays(new Date(), end, spendDays) : 0;
  const perDay = spendDaysLeft > 0 && left > 0 ? left / spendDaysLeft : 0;
  const dayWord = spendDays.length ? `${weekdaysLabel(spendDays)} day` : 'day';
  const pace = budgetPace(b);

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
            {daysLeft > 0 ? (spendDays.length ? ` · ${spendDaysLeft} ${weekdaysLabel(spendDays)} days left` : ` · ${daysLeft}d left`) : ' · ended'}
          </p>
        </div>
        <button onClick={onEdit} title="Edit budget" className="shrink-0 rounded-lg px-1.5 py-1 text-ink-muted/60 transition-colors hover:bg-gray-100 hover:text-ink">
          <Pencil size={13} />
        </button>
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
          ) : pace.status === 'will-run-out' && pace.runsOutOn ? (
            <span className="truncate font-semibold text-orange-600" title={`At this pace about ${formatCurrency(Math.round(pace.projected), currency)} by the end`}>
              At this pace it runs out ~{paceDay(pace.runsOutOn)}
            </span>
          ) : (
            <>{formatCurrency(left, currency)} left{perDay > 0 && ` · about ${formatCurrency(Math.floor(perDay), currency)} per ${dayWord}`}</>
          )}
        </p>
      </div>
    </div>
  );
}
