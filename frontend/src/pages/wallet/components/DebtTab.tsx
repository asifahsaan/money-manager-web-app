import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, X, ChevronDown, ChevronUp, Pencil, MessageCircle, CalendarClock, History, Search, Trash2, HandCoins } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { debtService } from '@/services/debt.service';
import { walletService } from '@/services/wallet.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Debt, DebtType } from '@/types';
import { format } from 'date-fns';
import { dueLabel, dueStatus } from '@/lib/debt-reminders';
import { DebtReminderModal } from './DebtReminderModal';
import { apiErrorMessage } from '@/lib/api-error';
import { DebtActivityLog, Pager } from './DebtActivityLog';
import type { DebtActivityRow } from '@/services/debt.service';

const PAGE_SIZE = 10;
type View = 'all' | 'RECEIVABLE' | 'PAYABLE' | 'closed';
type Sort = 'due' | 'amount' | 'newest' | 'name';
const SORT_LABEL: Record<Sort, string> = { due: 'Due date', amount: 'Amount left', newest: 'Newest', name: 'Name' };

const today = format(new Date(), 'yyyy-MM-dd');

const createSchema = z.object({
  type: z.enum(['PAYABLE', 'RECEIVABLE']),
  personName: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  totalAmount: z.string().refine((v) => Number(v) > 0),
  walletId: z.string().min(1, 'Please select a wallet.'),
  color: z.string().optional(),
  date: z.string().min(1),
  dueDate: z.string().optional(),
  contactPhone: z.string().optional().refine((v) => !v || /^\+?[\d\s-]{7,20}$/.test(v), 'Enter a valid phone number'),
  contactEmail: z.string().optional().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
});

const editSchema = z.object({
  personName: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  totalAmount: z.string().refine((v) => Number(v) > 0, 'Must be > 0'),
  walletId: z.string().optional(),
  color: z.string().optional(),
  date: z.string().min(1),
  dueDate: z.string().optional(),
  contactPhone: z.string().optional().refine((v) => !v || /^\+?[\d\s-]{7,20}$/.test(v), 'Enter a valid phone number'),
  contactEmail: z.string().optional().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
});

const entryEditSchema = z.object({
  walletId: z.string().min(1, 'Please select a wallet.'),
  note: z.string().optional(),
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
type EntryEditFormData = z.infer<typeof entryEditSchema>;
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
  const [editingEntry, setEditingEntry] = useState<{ debtId: number; entry: NonNullable<Debt['entries']>[0] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reminder, setReminder] = useState<{ debt: Debt; justCreated: boolean } | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [page, setPage] = useState(1);

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

  const { register: regEE, handleSubmit: hsEE, reset: resetEE, formState: { errors: errEE } } = useForm<EntryEditFormData>({
    resolver: zodResolver(entryEditSchema),
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
        dueDate: data.dueDate || undefined,
        contactPhone: data.contactPhone?.trim() || undefined,
        contactEmail: data.contactEmail?.trim() || undefined,
      }),
    onSuccess: (debt) => {
      toast.success('Debt created');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      qc.invalidateQueries({ queryKey: ['wallets', accountId] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setShowCreate(false);
      resetC();
      // Offer to tell the other person right away
      if (debt && (debt.contactPhone || debt.contactEmail)) setReminder({ debt, justCreated: true });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create debt')),
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
        dueDate: data.dueDate || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Debt updated');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      setEditingDebt(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update debt')),
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

  const entryEditMutation = useMutation({
    mutationFn: (data: EntryEditFormData) =>
      debtService.updateEntry(editingEntry!.debtId, editingEntry!.entry.id, {
        walletId: Number(data.walletId),
        note: data.note,
        date: data.date,
      }),
    onSuccess: () => {
      toast.success('Entry updated');
      qc.invalidateQueries({ queryKey: ['debts', accountId] });
      qc.invalidateQueries({ queryKey: ['wallets', accountId] });
      setEditingEntry(null);
    },
    onError: () => toast.error('Failed to update entry'),
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
      dueDate: d.dueDate ? d.dueDate.slice(0, 10) : '',
      contactPhone: d.contactPhone ?? '',
      contactEmail: d.contactEmail ?? '',
    });
  }

  function openEntryEditFromLog(r: DebtActivityRow) {
    if (!r.entryId) return;
    openEntryEdit(r.debtId, {
      id: r.entryId,
      debtId: r.debtId,
      type: r.kind === 'COLLECTED' ? 'COLLECTION' : 'PAYMENT',
      amount: r.amount,
      walletId: r.walletId,
      transactionId: null,
      date: r.date,
      note: r.note,
      createdAt: r.date,
    });
  }

  function openEntryEdit(debtId: number, entry: NonNullable<Debt['entries']>[0]) {
    setEditingEntry({ debtId, entry });
    resetEE({
      walletId: entry.walletId ? String(entry.walletId) : '',
      note: entry.note ?? '',
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
    });
  }

  if (!accountId) return null;


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Debts & loans</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'rgb(var(--c-brand-600))', color: '#ffffff', boxShadow: '0 8px 20px rgba(79,70,229,0.2)' }}
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
              <div className="rounded-xl border border-dashed border-gray-200 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">Reminder details <span className="font-normal text-gray-400">(optional)</span></p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{watchC('type') === 'PAYABLE' ? 'Pay back by' : 'Get back by'}</label>
                  <input type="date" {...regC('dueDate')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">WhatsApp / phone</label>
                    <input type="tel" inputMode="tel" placeholder="0300-1234567" {...regC('contactPhone')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                    {errC.contactPhone && <p className="text-expense text-xs mt-1">{errC.contactPhone.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input type="email" placeholder="name@email.com" {...regC('contactEmail')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                    {errC.contactEmail && <p className="text-expense text-xs mt-1">{errC.contactEmail.message}</p>}
                  </div>
                </div>
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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
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
              <div className="rounded-xl border border-dashed border-gray-200 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">Reminder details <span className="font-normal text-gray-400">(optional)</span></p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{editingDebt?.type === 'PAYABLE' ? 'Pay back by' : 'Get back by'}</label>
                  <input type="date" {...regE('dueDate')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">WhatsApp / phone</label>
                    <input type="tel" inputMode="tel" placeholder="0300-1234567" {...regE('contactPhone')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                    {errE.contactPhone && <p className="text-expense text-xs mt-1">{errE.contactPhone.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input type="email" placeholder="name@email.com" {...regE('contactEmail')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                    {errE.contactEmail && <p className="text-expense text-xs mt-1">{errE.contactEmail.message}</p>}
                  </div>
                </div>
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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {editMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {reminder && (
        <DebtReminderModal
          debt={reminder.debt}
          currency={currency}
          title={reminder.justCreated ? `Let ${reminder.debt.personName} know?` : undefined}
          onClose={() => setReminder(null)}
        />
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
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {payMutation.isPending ? 'Processing…' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Entry Edit modal ── */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingEntry(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <span className="font-bold text-sm text-gray-800">Edit Entry</span>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{editingEntry.entry.type.toLowerCase()} · {formatCurrency(Number(editingEntry.entry.amount), currency)}</p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
            </div>
            <form onSubmit={hsEE((d) => entryEditMutation.mutate(d))} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Wallet</label>
                <select {...regEE('walletId')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Select wallet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(Number(w.currentBalance), currency)})</option>)}
                </select>
                {errEE.walletId && <p className="text-expense text-xs mt-1">{errEE.walletId.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" {...regEE('date')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
                <input {...regEE('note')} placeholder="Optional note" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <button type="submit" disabled={entryEditMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'rgb(var(--c-brand-600))' }}>
                {entryEditMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {historyDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryDebt(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <span className="font-bold text-sm text-gray-800">History — {historyDebt.personName}</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(Number(historyDebt.settledAmount), currency)} of {formatCurrency(Number(historyDebt.totalAmount), currency)} settled
                </p>
              </div>
              <button onClick={() => setHistoryDebt(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
            </div>
            <div className="p-5">
              <DebtActivityLog
                bare
                accountId={accountId}
                currency={currency}
                wallets={wallets}
                debts={debts}
                debtId={historyDebt.id}
                onEditEntry={openEntryEditFromLog}
              />
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
      ) : debts.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <HandCoins size={36} className="text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-ink">Track money you lend or borrow</p>
          <p className="mt-1 max-w-sm text-xs text-ink-muted">Add who owes you and whom you owe. Payments, reminders and the full history stay in one place.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-amber-600 font-semibold hover:underline">
            Add your first debt
          </button>
        </div>
      ) : (
        <>
          <DebtSummary debts={debts} currency={currency} onPick={(v) => { setView(v); setPage(1); }} />
          <DebtList
            debts={debts}
            currency={currency}
            wallets={wallets}
            view={view}
            search={search}
            sort={sort}
            page={page}
            onView={(v) => { setView(v); setPage(1); }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onSort={(v) => { setSort(v); setPage(1); }}
            onPage={setPage}
            expandedId={expandedId}
            onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
            onPay={(d) => { setPayingDebt(d); resetP(); }}
            onEdit={openEdit}
            onDelete={(d) => setConfirmDelete(d.id)}
            onRemind={(d) => setReminder({ debt: d, justCreated: false })}
            onHistory={setHistoryDebt}
          />
          <DebtActivityLog
            accountId={accountId}
            currency={currency}
            wallets={wallets}
            debts={debts}
            onEditEntry={openEntryEditFromLog}
          />
        </>
      )}
    </div>
  );
}

const isOpen = (d: Debt) => d.status !== 'CLOSED';

function DebtSummary({ debts, currency, onPick }: { debts: Debt[]; currency: string; onPick: (v: View) => void }) {
  const open = debts.filter(isOpen);
  const sum = (list: Debt[]) => list.reduce((s, d) => s + Number(d.remainingAmount), 0);
  const receive = open.filter((d) => d.type === 'RECEIVABLE');
  const pay = open.filter((d) => d.type === 'PAYABLE');
  const net = sum(receive) - sum(pay);
  const urgent = open.filter((d) => ['overdue', 'today', 'soon'].includes(dueStatus(d).kind));
  const overdue = urgent.filter((d) => dueStatus(d).kind === 'overdue').length;
  const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

  const cards = [
    { label: 'To receive', value: formatCurrency(sum(receive), currency), sub: receive.length ? people(receive.length) : 'No one owes you', tone: 'text-income', view: 'RECEIVABLE' as View },
    { label: 'To pay', value: formatCurrency(sum(pay), currency), sub: pay.length ? people(pay.length) : 'You owe nothing', tone: 'text-expense', view: 'PAYABLE' as View },
    { label: 'Net position', value: `${net >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(net), currency)}`, sub: net > 0 ? 'In your favour' : net < 0 ? 'You owe more' : 'All square', tone: net >= 0 ? 'text-income' : 'text-expense', view: 'all' as View },
    {
      label: 'Due soon / overdue',
      value: String(urgent.length),
      sub: urgent.length ? (overdue ? `${overdue} overdue` : urgent.slice(0, 2).map((d) => d.personName).join(', ')) : 'Nothing due this week',
      tone: overdue ? 'text-expense' : urgent.length ? 'text-orange-600' : 'text-ink',
      view: 'all' as View,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <button key={c.label} onClick={() => onPick(c.view)} className="stat-card text-left transition-colors hover:border-primary-200">
          <p className="text-[11px] font-medium text-ink-muted">{c.label}</p>
          <p className={cn('mt-0.5 text-lg font-black tabular-nums', c.tone)}>{c.value}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">{c.sub}</p>
        </button>
      ))}
    </div>
  );
}

function DebtList(props: {
  debts: Debt[];
  currency: string;
  wallets: { id: number; name: string }[];
  view: View;
  search: string;
  sort: Sort;
  page: number;
  onView: (v: View) => void;
  onSearch: (v: string) => void;
  onSort: (v: Sort) => void;
  onPage: (p: number) => void;
  expandedId: number | null;
  onToggle: (id: number) => void;
  onPay: (d: Debt) => void;
  onEdit: (d: Debt) => void;
  onDelete: (d: Debt) => void;
  onRemind: (d: Debt) => void;
  onHistory: (d: Debt) => void;
}) {
  const { debts, view, search, sort, page } = props;

  const counts = useMemo(() => ({
    all: debts.filter(isOpen).length,
    RECEIVABLE: debts.filter((d) => isOpen(d) && d.type === 'RECEIVABLE').length,
    PAYABLE: debts.filter((d) => isOpen(d) && d.type === 'PAYABLE').length,
    closed: debts.filter((d) => !isOpen(d)).length,
  }), [debts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = debts.filter((d) => {
      if (view === 'closed' ? isOpen(d) : !isOpen(d)) return false;
      if ((view === 'RECEIVABLE' || view === 'PAYABLE') && d.type !== view) return false;
      return !q || d.personName.toLowerCase().includes(q) || (d.description ?? '').toLowerCase().includes(q);
    });
    const byNewest = (a: Debt, b: Debt) => b.date.localeCompare(a.date) || b.id - a.id;
    return list.sort((a, b) => {
      if (sort === 'amount') return Number(b.remainingAmount) - Number(a.remainingAmount);
      if (sort === 'name') return a.personName.localeCompare(b.personName);
      if (sort === 'newest') return byNewest(a, b);
      // due: dated debts first (soonest/most overdue first), then newest
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return byNewest(a, b);
    });
  }, [debts, view, search, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const tabs: { v: View; label: string }[] = [
    { v: 'all', label: 'All open' },
    { v: 'RECEIVABLE', label: 'To receive' },
    { v: 'PAYABLE', label: 'To pay' },
    { v: 'closed', label: 'Settled' },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.v}
              onClick={() => props.onView(t.v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                view === t.v ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:bg-gray-100 hover:text-ink',
              )}
            >
              {t.label} <span className="ml-0.5 opacity-70">{counts[t.v]}</span>
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:flex-none">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => props.onSearch(e.target.value)}
              placeholder="Search name or note"
              className="h-8 w-full rounded-lg border border-line bg-surface pl-7 sm:w-44 pr-2 text-xs text-ink focus:border-primary-500 focus:outline-none"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => props.onSort(e.target.value as Sort)}
            aria-label="Sort by"
            className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink focus:border-primary-500 focus:outline-none"
          >
            {(Object.keys(SORT_LABEL) as Sort[]).map((k) => <option key={k} value={k}>Sort: {SORT_LABEL[k]}</option>)}
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-muted">
          {search ? 'No debts match your search.' : view === 'PAYABLE' ? 'You don’t owe anyone. 🎉' : view === 'RECEIVABLE' ? 'No one owes you right now.' : view === 'closed' ? 'No settled debts yet.' : 'No open debts.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((d) => (
            <DebtRow
              key={d.id}
              debt={d}
              currency={props.currency}
              wallets={props.wallets}
              expanded={props.expandedId === d.id}
              onToggle={() => props.onToggle(d.id)}
              onPay={() => props.onPay(d)}
              onEdit={() => props.onEdit(d)}
              onDelete={() => props.onDelete(d)}
              onRemind={() => props.onRemind(d)}
              onHistory={() => props.onHistory(d)}
            />
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-ink-muted">
          <span>
            {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <Pager page={current} pages={pages} onChange={props.onPage} />
        </div>
      )}
    </div>
  );
}

function DebtRow({ debt: d, currency, wallets, expanded, onToggle, onPay, onEdit, onDelete, onRemind, onHistory }: {
  debt: Debt;
  currency: string;
  wallets: { id: number; name: string }[];
  expanded: boolean;
  onToggle: () => void;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemind: () => void;
  onHistory: () => void;
}) {
  const due = dueStatus(d);
  const dueText = dueLabel(d);
  const total = Number(d.totalAmount);
  const pct = total > 0 ? Math.min(100, (Number(d.settledAmount) / total) * 100) : 0;
  const receivable = d.type === 'RECEIVABLE';
  const closed = d.status === 'CLOSED';
  const accent = d.color ?? (receivable ? '#10B981' : '#EF4444');
  const linkedWallet = d.walletId ? wallets.find((w) => w.id === d.walletId)?.name : null;
  const initials = d.personName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <li>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>
          {initials || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-ink">{d.personName}</p>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              receivable ? 'bg-income-light text-income-dark' : 'bg-expense-light text-expense-dark',
            )}>
              {receivable ? 'Owes you' : 'You owe'}
            </span>
            {closed && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Settled</span>}
            {dueText && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                due.kind === 'overdue' ? 'bg-red-50 text-red-600' :
                due.kind === 'today' || due.kind === 'soon' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500',
              )}>
                <CalendarClock size={10} /> {dueText}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-ink-muted">
            {format(new Date(d.date), 'd MMM yyyy')}{d.description ? ` · ${d.description}` : ''}
          </p>
        </div>
        <div className="hidden w-28 shrink-0 sm:block" title={`${pct.toFixed(0)}% settled`}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: receivable ? '#10B981' : '#EF4444' }} />
          </div>
          <p className="mt-1 text-[10px] text-ink-muted">{pct.toFixed(0)}% settled</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-bold tabular-nums', closed ? 'text-ink-muted' : receivable ? 'text-income' : 'text-expense')}>
            {formatCurrency(Number(d.remainingAmount), currency)}
          </p>
          <p className="text-[10px] text-ink-muted">of {formatCurrency(total, currency)}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="shrink-0 text-ink-muted" /> : <ChevronDown size={14} className="shrink-0 text-ink-muted" />}
      </button>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 px-4 pb-3 pt-2 sm:pl-16">
          {linkedWallet && (
            <p className="mr-auto w-full text-[11px] text-ink-muted sm:w-auto">
              {receivable ? 'Lent from' : 'Received in'} <span className="font-semibold text-ink">{linkedWallet}</span>
              {' · '}{formatCurrency(Number(d.settledAmount), currency)} {receivable ? 'received back' : 'paid back'}
            </p>
          )}
          {!closed && (
            <button
              onClick={onPay}
              className="flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
              style={{ background: 'rgb(var(--c-brand-600))' }}
            >
              {receivable ? 'Record collection' : 'Record payment'}
            </button>
          )}
          {!closed && (
            <button
              onClick={onRemind}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <MessageCircle size={11} /> Remind
            </button>
          )}
          <button onClick={onHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-line hover:bg-gray-100 transition-colors">
            <History size={11} /> History
          </button>
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-line hover:bg-gray-100 transition-colors">
            <Pencil size={11} /> Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </li>
  );
}
