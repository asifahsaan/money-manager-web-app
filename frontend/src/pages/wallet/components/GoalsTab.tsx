import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { goalService } from '@/services/goal.service';
import { walletService } from '@/services/wallet.service';
import { formatCurrency } from '@/lib/utils';
import { Goal } from '@/types';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

const createSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.string().refine((v) => Number(v) > 0),
  goalDate: z.string().min(1),
  walletId: z.string().optional(),
  color: z.string().optional(),
});

const entrySchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0),
  walletId: z.string().min(1, 'Wallet required'),
  date: z.string().min(1),
  note: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EntryFormData = z.infer<typeof entrySchema>;

const GOAL_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function GoalsTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [entryType, setEntryType] = useState<'deposit' | 'withdraw' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', accountId],
    queryFn: () => goalService.getAll(accountId!),
    enabled: !!accountId,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate, watch: watchCreate, setValue: setCreate, formState: { errors: errCreate } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { color: GOAL_COLORS[0], goalDate: today },
  });

  const { register: regEntry, handleSubmit: hsEntry, reset: resetEntry, formState: { errors: errEntry } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { date: today },
  });

  const selectedColor = watchCreate('color');

  const createMutation = useMutation({
    mutationFn: (data: CreateFormData) =>
      goalService.create({
        accountId: accountId!,
        name: data.name,
        targetAmount: Number(data.targetAmount),
        goalDate: data.goalDate,
        walletId: data.walletId ? Number(data.walletId) : undefined,
        color: data.color,
      }),
    onSuccess: () => {
      toast.success('Goal created');
      qc.invalidateQueries({ queryKey: ['goals', accountId] });
      setShowCreate(false);
      resetCreate();
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const entryMutation = useMutation({
    mutationFn: (data: EntryFormData) => {
      const payload = { amount: Number(data.amount), walletId: Number(data.walletId), date: data.date, note: data.note };
      return entryType === 'deposit'
        ? goalService.deposit(selectedGoal!.id, payload)
        : goalService.withdraw(selectedGoal!.id, payload);
    },
    onSuccess: () => {
      toast.success(entryType === 'deposit' ? 'Deposited' : 'Withdrawn');
      qc.invalidateQueries({ queryKey: ['goals', accountId] });
      qc.invalidateQueries({ queryKey: ['wallets', accountId] });
      setEntryType(null);
      setSelectedGoal(null);
      resetEntry();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => goalService.delete(id),
    onSuccess: () => {
      toast.success('Goal deleted');
      qc.invalidateQueries({ queryKey: ['goals', accountId] });
      setConfirmDelete(null);
    },
  });

  if (!accountId) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Saving Goals</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#78350f', boxShadow: '0 8px 20px rgba(217,119,6,0.2)' }}
        >
          <Plus size={15} /> Add Goal
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">New Goal</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={hsCreate((d) => createMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Goal Name</label>
                <input {...regCreate('name')} placeholder="e.g. Buy a car"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errCreate.name && <p className="text-expense text-xs">{errCreate.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Target Amount</label>
                  <input type="number" step="0.01" {...regCreate('targetAmount')} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Target Date</label>
                  <input type="date" {...regCreate('goalDate')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Default Wallet (optional)</label>
                <select {...regCreate('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">No default</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setCreate('color', c)}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: selectedColor === c ? '#000' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {createMutation.isPending ? 'Saving…' : 'Create Goal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Entry modal (deposit / withdraw) */}
      {entryType && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEntryType(null); setSelectedGoal(null); }} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800 capitalize">{entryType} — {selectedGoal.name}</span>
              <button onClick={() => { setEntryType(null); setSelectedGoal(null); }} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={hsEntry((d) => entryMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                <input type="number" step="0.01" {...regEntry('amount')} placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errEntry.amount && <p className="text-expense text-xs">{errEntry.amount.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Wallet</label>
                <select {...regEntry('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
                {errEntry.walletId && <p className="text-expense text-xs">{errEntry.walletId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input type="date" {...regEntry('date')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
                  <input {...regEntry('note')} placeholder="Note…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <button type="submit" disabled={entryMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {entryMutation.isPending ? 'Processing…' : `Confirm ${entryType}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No goals yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((g) => {
            const target = Number(g.targetAmount);
            const saved = Number(g.savedAmount);
            const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            const color = g.color ?? '#10B981';
            return (
              <div key={g.id} className="glass-card p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.1)' }}
                    >
                      <Target size={16} color="white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{g.name}</p>
                      <p className="text-[10px] text-gray-400">By {format(new Date(g.goalDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <span className="text-base font-black" style={{ color }}>{pct.toFixed(0)}%</span>
                </div>

                <p className="text-xs text-gray-400 mb-2.5">
                  Saved {formatCurrency(saved, currency)} of {formatCurrency(target, currency)}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedGoal(g); setEntryType('deposit'); resetEntry(); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-amber-900 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 6px 16px rgba(217,119,6,0.2)' }}
                  >
                    <TrendingUp size={12} /> Deposit
                  </button>
                  <button
                    onClick={() => { setSelectedGoal(g); setEntryType('withdraw'); resetEntry(); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <TrendingDown size={12} /> Withdraw
                  </button>
                  <button
                    onClick={() => confirmDelete === g.id ? deleteMutation.mutate(g.id) : setConfirmDelete(g.id)}
                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
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
