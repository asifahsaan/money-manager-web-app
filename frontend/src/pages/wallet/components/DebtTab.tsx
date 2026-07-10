import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, X, User, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
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
  walletId: z.string().min(1, 'Please select a wallet.'),
  color: z.string().optional(),
  date: z.string().min(1),
});

const editSchema = z.object({
  personName: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  totalAmount: z.string().refine((v) => Number(v) > 0, 'Must be > 0'),
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
type EditFormData = z.infer<typeof editSchema>;
type PayFormData = z.infer<typeof paySchema>;

const DEBT_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899'];

export function DebtTab() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accountId = activeAccount?.id;
  const currency = activeAccount?.currency ?? 'Rs.';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const { register: regE, handleSubmit: hsE, reset: resetE, watch: watchE, setValue: setValE, formState: { errors: errE } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const { register: regP, handleSubmit: hsP, reset: resetP, formState: { errors: errP } } = useForm<PayFormData>({
    resolver: zodResolver(paySchema),
    defaultValues: { date: today },
  });

  const selectedColor = watchC('color');
  const selectedEditColor = watchE('color');

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

  const editMutation = useMutation({
    mutationFn: (data: EditFormData) =>
      debtService.update(editingDebt!.id, {
        personName: data.personName,
        description: data.description,
        totalAmount: Number(data.totalAmount),
        walletId: data.walletId ? Number(data.walletId) : null,
        color: data.color,
        date: data.date,
      }),
    onSuccess: () => {
      toast.success('Debt updated');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      setEditingDebt(null);
    },
    onError: () => toast.error('Failed to update debt'),
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
      setExpandedId(null);
    },
  });

  function openEdit(d: Debt) {
    setEditingDebt(d);
    resetE({
      personName: d.personName,
      description: d.description ?? '',
      totalAmount: String(Number(d.totalAmount)),
      walletId: d.walletId ? String(d.walletId) : '',
      color: d.color ?? DEBT_COLORS[0],
      date: format(new Date(d.date), 'yyyy-MM-dd'),
    });
  }

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

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">New Debt</span>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
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
                <input {...regC('personName')} placeholder="Name…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errC.personName && <p className="text-expense text-xs">{errC.personName.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                <input {...regC('description')} placeholder="What for?" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <input type="number" step="0.01" {...regC('totalAmount')} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input type="date" {...regC('date')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {watchC('type') === 'PAYABLE' ? 'Receive to Wallet' : 'Pay from Wallet'}
                </label>
                <select {...regC('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
                {errC.walletId && <p className="text-expense text-xs mt-1">{errC.walletId.message}</p>}
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

      {/* ── Edit modal ── */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingDebt(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-800">Edit Debt</span>
              <button onClick={() => setEditingDebt(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
            </div>
            <form onSubmit={hsE((d) => editMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Person Name</label>
                <input {...regE('personName')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                {errE.personName && <p className="text-expense text-xs">{errE.personName.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                <input {...regE('description')} placeholder="What for?" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Total Amount</label>
                  <input type="number" step="0.01" {...regE('totalAmount')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  {errE.totalAmount && <p className="text-expense text-xs">{errE.totalAmount.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input type="date" {...regE('date')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {editingDebt?.type === 'PAYABLE' ? 'Received in Wallet' : 'Paid from Wallet'}
                  <span className="text-gray-400 font-normal"> (optional)</span>
                </label>
                <select {...regE('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">No wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex gap-2">
                  {DEBT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setValE('color', c)}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: selectedEditColor === c ? '#000' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={editMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-amber-900 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}>
                {editMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <X size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-1">Delete Debt?</h3>
            <p className="text-xs text-gray-400 mb-5">This will permanently remove the debt record. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay/Collect modal ── */}
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
              <button onClick={() => setPayingDebt(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
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
                  <input type="date" {...regP('date')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Note</label>
                  <input {...regP('note')} placeholder="Optional note" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
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
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-expense mb-3 pb-2 border-b border-gray-100">Payable</p>
            {payable.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No payable debts</p>
            ) : (
              <div className="space-y-2">
                {payable.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    currency={currency}
                    wallets={wallets}
                    expanded={expandedId === d.id}
                    onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    onPay={() => { setPayingDebt(d); resetP(); }}
                    onEdit={() => openEdit(d)}
                    onDelete={() => setConfirmDelete(d.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-income mb-3 pb-2 border-b border-gray-100">Receivable</p>
            {receivable.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No receivable debts</p>
            ) : (
              <div className="space-y-2">
                {receivable.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    currency={currency}
                    wallets={wallets}
                    expanded={expandedId === d.id}
                    onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    onPay={() => { setPayingDebt(d); resetP(); }}
                    onEdit={() => openEdit(d)}
                    onDelete={() => setConfirmDelete(d.id)}
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

function DebtCard({ debt: d, currency, wallets, expanded, onToggle, onPay, onEdit, onDelete }: {
  debt: Debt;
  currency: string;
  wallets: { id: number; name: string }[];
  expanded: boolean;
  onToggle: () => void;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Number(d.totalAmount) > 0 ? (Number(d.settledAmount) / Number(d.totalAmount)) * 100 : 0;
  const isPayable = d.type === 'PAYABLE';
  const barColor = isPayable ? '#EF4444' : '#3B82F6';
  const nameColor = isPayable ? '#EF4444' : '#3B82F6';

  return (
    <div className="bg-white/60 rounded-xl border border-white/80 overflow-hidden">
      {/* Clickable summary row */}
      <button className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/40 transition-colors" onClick={onToggle}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: d.color ?? barColor, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.1)' }}
        >
          <User size={14} color="white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm truncate" style={{ color: nameColor }}>{d.personName}</p>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0',
              d.status === 'CLOSED' ? 'bg-green-50 text-green-600' :
              d.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-500',
            )}>
              {d.status.toLowerCase()}
            </span>
          </div>
          {d.description && <p className="text-[10px] text-gray-400 truncate">{d.description}</p>}
        </div>
        <div className="text-right flex-shrink-0 mr-1">
          <p className="text-sm font-black" style={{ color: barColor }}>
            {formatCurrency(Number(d.remainingAmount), currency)}
          </p>
          <p className="text-[10px] text-gray-400">of {formatCurrency(Number(d.totalAmount), currency)}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded: progress + actions */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100/60">
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 my-2.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mb-1.5">{pct.toFixed(0)}% settled • {formatCurrency(Number(d.settledAmount), currency)} paid</p>
          {(() => {
            const linkedWallet = d.walletId ? wallets.find((w) => w.id === d.walletId)?.name : null;
            const entryWalletIds = [...new Set((d.entries ?? []).map((e) => e.walletId).filter(Boolean) as number[])];
            const entryWalletNames = entryWalletIds.map((id) => wallets.find((w) => w.id === id)?.name).filter(Boolean).join(', ');
            return (
              <>
                {linkedWallet && (
                  <p className="text-[10px] text-gray-400">
                    {d.type === 'PAYABLE' ? 'Received in' : 'Paid from'}:{' '}
                    <span className="font-semibold text-gray-500">{linkedWallet}</span>
                  </p>
                )}
                {entryWalletNames && (
                  <p className="text-[10px] text-gray-400">
                    {d.type === 'PAYABLE' ? 'Paid from' : 'Collected in'}:{' '}
                    <span className="font-semibold text-gray-500">{entryWalletNames}</span>
                  </p>
                )}
                {(linkedWallet || entryWalletNames) && <div className="mb-2.5" />}
              </>
            );
          })()}

          <div className="flex items-center gap-2 flex-wrap">
            {d.status !== 'CLOSED' && (
              <button
                onClick={onPay}
                className="flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 12px rgba(217,119,6,0.2)' }}
              >
                {isPayable ? 'Pay' : 'Collect'}
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Pencil size={11} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-xl text-xs transition-colors font-medium text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
