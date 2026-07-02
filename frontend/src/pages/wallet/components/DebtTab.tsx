import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, X, User } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { debtService } from '@/services/debt.service';
import { walletService } from '@/services/wallet.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Debt, DebtType } from '@/types';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

const createSchema = z.object({
  type: z.enum(['PAYABLE', 'RECEIVABLE']),
  personName: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  totalAmount: z.string().refine((v) => Number(v) > 0),
  walletId: z.string().optional(),
  color: z.string().optional(),
  date: z.string().min(1),
});

const paySchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0),
  walletId: z.string().min(1, 'Wallet required'),
  date: z.string().min(1),
  note: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type PayFormData = z.infer<typeof paySchema>;

const DEBT_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899'];

export function DebtTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts', accountId],
    queryFn: () => debtService.getAll(accountId!),
    enabled: !!accountId,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const { register: regC, handleSubmit: hsC, reset: resetC, watch: watchC, setValue: setValC, formState: { errors: errC } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'PAYABLE', date: today, color: DEBT_COLORS[0] },
  });

  const { register: regP, handleSubmit: hsP, reset: resetP, formState: { errors: errP } } = useForm<PayFormData>({
    resolver: zodResolver(paySchema),
    defaultValues: { date: today },
  });

  const selectedColor = watchC('color');

  const createMutation = useMutation({
    mutationFn: (data: CreateFormData) =>
      debtService.create({
        accountId: accountId!,
        type: data.type as DebtType,
        personName: data.personName,
        description: data.description,
        totalAmount: Number(data.totalAmount),
        walletId: data.walletId ? Number(data.walletId) : undefined,
        color: data.color,
        date: data.date,
      }),
    onSuccess: () => {
      toast.success('Debt created');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      setShowCreate(false);
      resetC();
    },
    onError: () => toast.error('Failed to create debt'),
  });

  const payMutation = useMutation({
    mutationFn: (data: PayFormData) =>
      debtService.pay(payingDebt!.id, { amount: Number(data.amount), walletId: Number(data.walletId), date: data.date, note: data.note }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      qc.invalidateQueries({ queryKey: ['wallets', accountId] });
      setPayingDebt(null);
      resetP();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => debtService.delete(id),
    onSuccess: () => {
      toast.success('Debt deleted');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      setConfirmDelete(null);
    },
  });

  if (!accountId) return null;

  const payable = debts.filter((d) => d.type === 'PAYABLE');
  const receivable = debts.filter((d) => d.type === 'RECEIVABLE');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Debt Tracker</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#78350f', boxShadow: '0 8px 20px rgba(217,119,6,0.2)' }}
        >
          <Plus size={15} /> Add Debt
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">New Debt</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={hsC((d) => createMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PAYABLE', 'RECEIVABLE'] as DebtType[]).map((t) => (
                    <label key={t} className={cn(
                      'flex items-center justify-center py-2 rounded-xl border-2 text-sm cursor-pointer transition-colors',
                      watchC('type') === t ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold' : 'border-gray-200 text-gray-500',
                    )}>
                      <input type="radio" value={t} {...regC('type')} className="hidden" />
                      {t === 'PAYABLE' ? 'I owe' : 'Owed to me'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Person Name</label>
                <input {...regC('personName')} placeholder="Name…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errC.personName && <p className="text-expense text-xs">{errC.personName.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                <input {...regC('description')} placeholder="What for?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <input type="number" step="0.01" {...regC('totalAmount')} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input type="date" {...regC('date')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {watchC('type') === 'PAYABLE' ? 'Pay from Wallet (optional)' : 'Receive to Wallet (optional)'}
                </label>
                <select {...regC('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex gap-2">
                  {DEBT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setValC('color', c)}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: selectedColor === c ? '#000' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {createMutation.isPending ? 'Saving…' : 'Create Debt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pay/Collect modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPayingDebt(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <span className="font-bold text-sm text-gray-800">
                  {payingDebt.type === 'PAYABLE' ? 'Record Payment' : 'Record Collection'} — {payingDebt.personName}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">Remaining: {formatCurrency(Number(payingDebt.remainingAmount), currency)}</p>
              </div>
              <button onClick={() => setPayingDebt(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={hsP((d) => payMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                <input type="number" step="0.01" {...regP('amount')} placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errP.amount && <p className="text-expense text-xs">{errP.amount.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Wallet</label>
                <select {...regP('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
                {errP.walletId && <p className="text-expense text-xs">{errP.walletId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input type="date" {...regP('date')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Note</label>
                  <input {...regP('note')} placeholder="Optional note"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <button type="submit" disabled={payMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {payMutation.isPending ? 'Processing…' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
      ) : debts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No debts tracked</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-amber-600 font-semibold hover:underline">
            Add your first debt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payable section panel */}
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-expense mb-3 pb-2 border-b border-gray-100">Payable</p>
            {payable.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No payable debts</p>
            ) : (
              <div className="space-y-3">
                {payable.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    currency={currency}
                    onPay={() => { setPayingDebt(d); resetP(); }}
                    onDelete={() => confirmDelete === d.id ? deleteMutation.mutate(d.id) : setConfirmDelete(d.id)}
                    deleteLabel={confirmDelete === d.id ? 'Confirm?' : undefined}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Receivable section panel */}
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-income mb-3 pb-2 border-b border-gray-100">Receivable</p>
            {receivable.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No receivable debts</p>
            ) : (
              <div className="space-y-3">
                {receivable.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    currency={currency}
                    onPay={() => { setPayingDebt(d); resetP(); }}
                    onDelete={() => confirmDelete === d.id ? deleteMutation.mutate(d.id) : setConfirmDelete(d.id)}
                    deleteLabel={confirmDelete === d.id ? 'Confirm?' : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DebtCard({ debt: d, currency, onPay, onDelete, deleteLabel }: {
  debt: Debt; currency: string; onPay: () => void; onDelete: () => void; deleteLabel?: string;
}) {
  const pct = Number(d.totalAmount) > 0 ? (Number(d.settledAmount) / Number(d.totalAmount)) * 100 : 0;
  const isPayable = d.type === 'PAYABLE';
  const barColor = isPayable ? '#EF4444' : '#3B82F6';
  const nameColor = isPayable ? '#EF4444' : '#3B82F6';

  return (
    <div className="bg-white/60 rounded-xl p-3 border border-white/80">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: d.color ?? barColor, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.1)' }}
          >
            <User size={14} color="white" />
          </div>
          <p className="font-bold text-sm" style={{ color: nameColor }}>{d.personName}</p>
        </div>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-semibold',
          d.status === 'CLOSED' ? 'bg-green-50 text-green-600' :
          d.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-500',
        )}>
          {d.status.toLowerCase()}
        </span>
      </div>

      {d.description && <p className="text-[10px] text-gray-400 pl-10 mb-1">{d.description}</p>}

      <p className="text-sm font-black pl-10 mb-2" style={{ color: barColor }}>
        {formatCurrency(Number(d.remainingAmount), currency)}
        <span className="text-[10px] font-normal text-gray-400 ml-1">
          remaining of {formatCurrency(Number(d.totalAmount), currency)}
        </span>
      </p>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex items-center gap-2">
        {d.status !== 'CLOSED' && (
          <button
            onClick={onPay}
            className="flex items-center px-4 py-1.5 rounded-xl text-xs font-bold text-amber-900 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 12px rgba(217,119,6,0.2)' }}
          >
            {isPayable ? 'Pay' : 'Collect'}
          </button>
        )}
        <button
          onClick={onDelete}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs transition-colors font-medium',
            deleteLabel ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
          )}
        >
          {deleteLabel ?? 'Delete'}
        </button>
      </div>
    </div>
  );
}
