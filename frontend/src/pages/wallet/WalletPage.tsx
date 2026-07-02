import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  LucideIcon,
  Plus,
  Trash2,
  X,
  Wallet as WalletIcon,
  CreditCard,
  Banknote,
  Smartphone,
  Pencil,
} from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { walletService } from '@/services/wallet.service';
import { statisticsService } from '@/services/statistics.service';
import { formatCurrency, cn } from '@/lib/utils';
import { Wallet, WalletType } from '@/types';
import { BudgetTab } from './components/BudgetTab';
import { GoalsTab } from './components/GoalsTab';
import { DebtTab } from './components/DebtTab';
import { RecurringTab } from './components/RecurringTab';

const WALLET_TYPES: { value: WalletType; label: string; Icon: LucideIcon }[] = [
  { value: 'CASH', label: 'Cash', Icon: Banknote },
  { value: 'BANK', label: 'Bank', Icon: WalletIcon },
  { value: 'CARD', label: 'Card', Icon: CreditCard },
  { value: 'E_WALLET', label: 'E-Wallet', Icon: Smartphone },
];

const WALLET_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
];

const schema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  type: z.enum(['CASH', 'BANK', 'CARD', 'E_WALLET', 'OTHER']),
  initialBalance: z.string().optional(),
  setBalance: z.string().optional(),
  color: z.string().optional(),
  includedInTotal: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function WalletPage() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'wallets' | 'budget' | 'goals' | 'debt' | 'recurring'>('wallets');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currency = activeAccount?.currency ?? 'Rs.';
  const accountId = activeAccount?.id;

  const today = new Date();
  const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd');

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const { data: monthStats } = useQuery({
    queryKey: ['wallet-stats', accountId, startDate, endDate],
    queryFn: () => statisticsService.getSummary(accountId!, startDate, endDate),
    enabled: !!accountId,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'CASH', color: WALLET_COLORS[0], includedInTotal: true },
  });

  const selectedColor = watch('color');

  const totalBalance = wallets
    .filter((w) => w.includedInTotal && !w.archived)
    .reduce((sum, w) => sum + Number(w.currentBalance), 0);
  const monthIncome = monthStats?.totalIncome ?? 0;
  const monthExpense = monthStats?.totalExpense ?? 0;
  const netTotal = monthIncome - monthExpense;

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (editing) {
        let computedInitialBalance: number | undefined;
        if (data.setBalance !== undefined && data.setBalance !== '') {
          // User wants to set the current balance to a specific value
          // newInitialBalance = oldInitialBalance + (desired - currentBalance)
          const desired = Number(data.setBalance);
          const current = Number(editing.currentBalance);
          const oldInitial = Number(editing.initialBalance);
          computedInitialBalance = oldInitial + (desired - current);
        } else if (data.initialBalance !== undefined && data.initialBalance !== '') {
          computedInitialBalance = Number(data.initialBalance);
        }
        return walletService.update(editing.id, {
          name: data.name,
          type: data.type,
          color: data.color,
          ...(computedInitialBalance !== undefined && { initialBalance: computedInitialBalance }),
          includedInTotal: data.includedInTotal ?? true,
        });
      }
      return walletService.create({
        accountId: accountId!,
        name: data.name,
        type: data.type,
        color: data.color,
        initialBalance: data.initialBalance ? Number(data.initialBalance) : 0,
        includedInTotal: data.includedInTotal ?? true,
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'Wallet updated' : 'Wallet created');
      queryClient.invalidateQueries({ queryKey: ['wallets', accountId] });
      closeForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Something went wrong');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (w: Wallet) => walletService.update(w.id, { includedInTotal: !w.includedInTotal }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets', accountId] }),
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => walletService.delete(editing!.id),
    onSuccess: () => {
      toast.success('Wallet deleted');
      queryClient.invalidateQueries({ queryKey: ['wallets', accountId] });
      closeForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to delete wallet');
    },
  });

  function openAdd() {
    setEditing(null);
    reset({ type: 'CASH', color: WALLET_COLORS[0], includedInTotal: true, name: '', initialBalance: '' });
    setShowForm(true);
  }

  function openEdit(w: Wallet, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(w);
    reset({
      name: w.name,
      type: w.type,
      color: w.color ?? WALLET_COLORS[0],
      initialBalance: '',
      includedInTotal: w.includedInTotal,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setConfirmDelete(false);
  }

  if (!accountId) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pt-4 pb-2">
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Total Balance</p>
          <p className={cn('text-lg font-black', totalBalance >= 0 ? 'text-gray-800' : 'text-expense')}>
            {formatCurrency(totalBalance, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Included wallets only</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Income This Month</p>
          <p className="text-lg font-black text-income">{formatCurrency(monthIncome, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Transfers excluded</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Expense This Month</p>
          <p className="text-lg font-black text-expense">{formatCurrency(monthExpense, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Budgets use expenses only</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Net Total</p>
          <p className={cn('text-lg font-black', netTotal >= 0 ? 'text-success' : 'text-expense')}>
            {formatCurrency(netTotal, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Income minus expense</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto glass-panel border-b border-white/50 shrink-0 px-2 pt-2 gap-1">
        {(['wallets', 'budget', 'goals', 'debt', 'recurring'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-xs font-medium whitespace-nowrap transition-all rounded-xl mb-1.5 capitalize',
              activeTab === tab
                ? 'bg-amber-50 text-amber-800 font-bold'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/60',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeTab !== 'wallets' && (
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'budget' && <BudgetTab />}
          {activeTab === 'goals' && <GoalsTab />}
          {activeTab === 'debt' && <DebtTab />}
          {activeTab === 'recurring' && <RecurringTab />}
        </div>
      )}

      {/* Wallet grid */}
      {activeTab === 'wallets' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Tab header */}
          <div className="flex items-center justify-between py-3">
            <p className="text-xs text-gray-400 font-medium">
              {wallets.filter((w) => w.includedInTotal && !w.archived).length} wallets included
              {' · '}transfers excluded from profit/loss
            </p>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f97316)',
                color: '#78350f',
                boxShadow: '0 8px 20px rgba(217,119,6,0.25)',
              }}
            >
              <Plus size={15} /> Add Wallet
            </button>
          </div>

          {isLoading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
          ) : wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <WalletIcon size={40} className="text-gray-300" />
              <p className="text-gray-400 text-sm">No wallets yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((w) => {
                const TypeInfo = WALLET_TYPES.find((t) => t.value === w.type) ?? WALLET_TYPES[0];
                const balance = Number(w.currentBalance);
                return (
                  <div
                    key={w.id}
                    onClick={() => navigate(`/wallet/${w.id}`)}
                    className="glass-card p-4 cursor-pointer hover:-translate-y-0.5 transition-all hover:shadow-card-hover"
                  >
                    {/* Top row: icon + toggle + edit */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: w.color ?? '#6B7280',
                          boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.08)',
                        }}
                      >
                        <TypeInfo.Icon size={22} color="white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(w); }}
                          className={cn(
                            'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                            w.includedInTotal ? 'bg-amber-400' : 'bg-gray-200',
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                              w.includedInTotal ? 'translate-x-5' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openEdit(w, e)}
                          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <p className="font-bold text-gray-800 mb-1">{w.name}</p>

                    {/* Balance */}
                    <p className={cn('text-2xl font-black mb-3', balance >= 0 ? 'text-income' : 'text-expense')}>
                      {formatCurrency(balance, currency)}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {TypeInfo.label.toLowerCase()}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          w.includedInTotal ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        {w.includedInTotal ? 'Included' : 'Excluded'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit Wallet' : 'New Wallet'}
              </h2>
              <button onClick={closeForm} className="p-1 rounded-full hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. My Bank Account"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
                {errors.name && <p className="text-xs text-expense mt-1">{errors.name.message}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {WALLET_TYPES.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('type', value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                        watch('type') === value
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-gray-100 hover:border-gray-200',
                      )}
                    >
                      <Icon size={20} className={watch('type') === value ? 'text-amber-600' : 'text-gray-400'} />
                      <span className="text-[10px] text-gray-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap items-center">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('color', c)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform',
                        selectedColor === c ? 'border-gray-800 scale-110' : 'border-transparent',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="relative">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full border-2 cursor-pointer overflow-hidden',
                        !WALLET_COLORS.includes(selectedColor ?? '')
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-300',
                      )}
                      title="Custom color"
                    >
                      <input
                        type="color"
                        value={selectedColor ?? '#000000'}
                        onChange={(e) => setValue('color', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: !WALLET_COLORS.includes(selectedColor ?? '')
                            ? selectedColor
                            : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Set Current Balance to <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <p className="text-[10px] text-gray-400 mb-1.5">
                    Current balance: <span className="font-semibold text-gray-600">{formatCurrency(Number(editing.currentBalance), currency)}</span> — leave blank to keep unchanged
                  </p>
                  <input
                    {...register('setBalance')}
                    type="number"
                    step="0.01"
                    placeholder={String(Number(editing.currentBalance))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Initial Balance (optional)</label>
                  <input
                    {...register('initialBalance')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Include in total */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('includedInTotal')}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-gray-700">Include in total balance</span>
              </label>

              {/* Delete (edit mode only) */}
              {editing && (
                <div>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                      Delete Wallet
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-center text-gray-500">
                        Wallets with transactions cannot be deleted.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate()}
                          disabled={deleteMutation.isPending}
                          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-semibold text-amber-900 disabled:opacity-60 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 10px 25px rgba(217,119,6,0.25)' }}
              >
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Wallet' : 'Create Wallet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
