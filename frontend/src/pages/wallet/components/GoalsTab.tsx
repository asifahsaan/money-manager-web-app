import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Trash2, X, Plus, Minus, Target, CheckCircle2 } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { goalService } from '@/services/goal.service';
import { walletService } from '@/services/wallet.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Goal } from '@/types';
import { differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns';
import { StatCard, SectionBar, AddButton } from '@/components/shared/StatCard';

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
    <div className="space-y-3">
      <SectionBar title="Saving goals" meta={goals.length ? `${goals.length} goal${goals.length === 1 ? '' : 's'} · money set aside for something specific` : 'Set aside money for something specific'}>
        <AddButton label="Add goal" onClick={() => setShowCreate(true)} />
      </SectionBar>

      {goals.length > 0 && <GoalsSummary goals={goals} currency={currency} />}

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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {entryMutation.isPending ? 'Processing…' : `Confirm ${entryType}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[136px]" />)}</div>
      ) : goals.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-sm text-gray-400">No goals yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {goals.map((g) => {
            const target = Number(g.targetAmount);
            const saved = Number(g.savedAmount);
            const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            const color = g.color ?? '#10B981';
            const done = saved >= target && target > 0;
            const days = differenceInCalendarDays(new Date(g.goalDate), new Date());
            const months = Math.max(1, differenceInCalendarMonths(new Date(g.goalDate), new Date()));
            const perMonth = !done && days > 0 ? (target - saved) / months : 0;
            return (
              <div key={g.id} className="card flex h-[136px] flex-col p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: color }}>
                    {done ? <CheckCircle2 size={15} color="white" /> : <Target size={15} color="white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink" title={g.name}>{g.name}</p>
                    <p className={cn('truncate text-[11px]', !done && days < 0 ? 'font-semibold text-expense' : 'text-ink-muted')}>
                      By {format(new Date(g.goalDate), 'd MMM yyyy')}
                      {done ? ' · reached' : days < 0 ? ` · ${-days}d late` : ` · ${days}d left`}
                    </p>
                  </div>
                  <span className="text-sm font-black tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
                </div>

                <div className="mt-auto">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs tabular-nums">
                    <span className="text-ink">
                      <b className="font-bold">{formatCurrency(saved, currency)}</b>
                      <span className="text-ink-muted"> of {formatCurrency(target, currency)}</span>
                    </span>
                    {perMonth > 0 && <span className="truncate text-[11px] text-ink-muted">{formatCurrency(Math.ceil(perMonth), currency)}/mo</span>}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => { setSelectedGoal(g); setEntryType('deposit'); resetEntry(); }}
                      className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
                      style={{ background: 'rgb(var(--c-brand-600))' }}
                    >
                      <Plus size={12} /> Deposit
                    </button>
                    <button
                      onClick={() => { setSelectedGoal(g); setEntryType('withdraw'); resetEntry(); }}
                      disabled={saved <= 0}
                      className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-line text-xs font-semibold text-ink-muted transition-colors hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Minus size={12} /> Withdraw
                    </button>
                    <button
                      onClick={() => confirmDelete === g.id ? deleteMutation.mutate(g.id) : setConfirmDelete(g.id)}
                      title={confirmDelete === g.id ? 'Tap again to delete' : 'Delete goal'}
                      className={cn(
                        'flex h-7 items-center rounded-lg px-2 text-xs transition-colors',
                        confirmDelete === g.id ? 'bg-red-500 font-semibold text-white' : 'text-ink-muted/60 hover:bg-red-50 hover:text-red-500',
                      )}
                    >
                      {confirmDelete === g.id ? 'Delete?' : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoalsSummary({ goals, currency }: { goals: Goal[]; currency: string }) {
  const target = goals.reduce((t, g) => t + Number(g.targetAmount), 0);
  const saved = goals.reduce((t, g) => t + Number(g.savedAmount), 0);
  const reached = goals.filter((g) => Number(g.savedAmount) >= Number(g.targetAmount)).length;
  const next = goals
    .filter((g) => Number(g.savedAmount) < Number(g.targetAmount))
    .sort((a, b) => a.goalDate.localeCompare(b.goalDate))[0];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Saved so far" tone="income" value={formatCurrency(saved, currency)} sub={`${target > 0 ? ((saved / target) * 100).toFixed(2) : '0.00'}% of all targets`} />
      <StatCard label="Still to save" value={formatCurrency(Math.max(0, target - saved), currency)} sub={`Targets total ${formatCurrency(target, currency)}`} />
      <StatCard label="Goals reached" tone={reached ? 'income' : 'neutral'} value={`${reached} / ${goals.length}`} sub={reached === goals.length ? 'All done' : 'Keep going'} />
      <StatCard label="Next deadline" tone="brand" value={next ? format(new Date(next.goalDate), 'd MMM yyyy') : '—'} sub={next ? next.name : 'Nothing pending'} />
    </div>
  );
}
