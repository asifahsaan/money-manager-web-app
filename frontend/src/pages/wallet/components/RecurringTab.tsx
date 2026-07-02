import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Play, RefreshCw } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { recurringService } from '@/services/recurring.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
// walletService kept for the create form wallet selector
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionType, RecurringFrequency } from '@/types';
import { format } from 'date-fns';

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Recurring</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#78350f', boxShadow: '0 8px 20px rgba(217,119,6,0.2)' }}
        >
          <Plus size={15} /> Add Recurring
        </button>
      </div>

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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {createMutation.isPending ? 'Saving…' : 'Create Recurring'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
      ) : recurrings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No recurring transactions</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Add your first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recurrings.map((r) => {
            const typeColor = r.transactionType === 'INCOME' ? 'text-income' : r.transactionType === 'EXPENSE' ? 'text-expense' : 'text-blue-500';
            const iconBg = r.transactionType === 'INCOME' ? '#10B981' : r.transactionType === 'EXPENSE' ? '#EF4444' : '#3B82F6';
            const cat = r.category;
            const meta = cat?.name ?? null;

            return (
              <div key={r.id} className="glass-card p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat?.color ?? iconBg, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.1)' }}
                    >
                      <RefreshCw size={15} color="white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{r.description ?? r.frequency.toLowerCase()}</p>
                      {meta && <p className="text-[10px] text-gray-400">{meta}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-base font-black', typeColor)}>
                      {formatCurrency(Number(r.amount), currency)}
                    </p>
                    <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                      {r.frequency.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 flex-1">
                    Next: {format(new Date(r.nextOccurrence), 'MMM d, yyyy')}
                  </span>
                  <button
                    onClick={() => confirmExecute === r.id ? executeMutation.mutate(r.id) : setConfirmExecute(r.id)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all',
                      confirmExecute === r.id ? 'bg-green-500 text-white' : 'text-amber-900',
                    )}
                    style={confirmExecute !== r.id ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 6px 16px rgba(217,119,6,0.2)' } : {}}
                  >
                    <Play size={11} />
                    {confirmExecute === r.id ? 'Confirm?' : 'Execute Now'}
                  </button>
                  <button
                    onClick={() => confirmDelete === r.id ? deleteMutation.mutate(r.id) : setConfirmDelete(r.id)}
                    className={cn(
                      'p-1.5 rounded-xl text-xs transition-colors',
                      confirmDelete === r.id ? 'bg-red-500 text-white' : 'text-gray-300 hover:text-red-500 hover:bg-red-50',
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
