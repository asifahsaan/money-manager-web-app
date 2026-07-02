import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { budgetService } from '@/services/budget.service';
import { categoryService } from '@/services/category.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Budget, PeriodType } from '@/types';
import { format } from 'date-fns';

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Budgets</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#78350f', boxShadow: '0 8px 20px rgba(217,119,6,0.2)' }}
        >
          <Plus size={15} /> Add Budget
        </button>
      </div>

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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {createMutation.isPending ? 'Saving…' : 'Save Budget'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No budgets yet</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map((b) => (
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

function BudgetCard({ budget: b, currency, onDelete, deleteLabel }: {
  budget: Budget;
  currency: string;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const pct = b.percentage;
  const left = Math.max(0, Number(b.amount) - b.spent);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-0.5">
        <p className="font-bold text-gray-800 text-sm">{b.category.name}</p>
        <p className="text-sm font-bold text-gray-700">{formatCurrency(Number(b.amount), currency)}</p>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Spent {formatCurrency(b.spent, currency)} • Left {formatCurrency(left, currency)}
      </p>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : 'linear-gradient(90deg, #fbbf24, #f97316)',
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] px-2 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-400">
          {b.startDate.substring(0, 10)} — {b.endDate.substring(0, 10)}
        </span>
        <button
          onClick={onDelete}
          className={cn(
            'text-xs px-2.5 py-1 rounded-xl transition-colors font-medium',
            deleteLabel ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
          )}
        >
          {deleteLabel ?? 'Delete'}
        </button>
      </div>
    </div>
  );
}
