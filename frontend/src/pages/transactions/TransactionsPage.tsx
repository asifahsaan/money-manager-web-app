import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, Download, X, Wallet, Eye, EyeOff } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { useAccountStore } from '@/stores/account.store';
import { transactionService } from '@/services/transaction.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
import { budgetService } from '@/services/budget.service';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionItem } from './components/TransactionItem';
import { TransactionModal } from './components/TransactionModal';

interface DayGroup {
  date: string;
  label: string;
  transactions: Transaction[];
  income: number;
  expense: number;
}

function groupByDate(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.date.substring(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => {
      const d = new Date(date + 'T00:00:00');
      return {
        date,
        label: format(d, 'EEE, d MMM'),
        transactions: txs,
        income: txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
        expense: txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
      };
    });
}

const WALLET_ICON: Record<string, string> = {
  CASH: '💵',
  BANK: '🏦',
  CARD: '💳',
  EWALLET: '📱',
};

export function TransactionsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterWalletId, setFilterWalletId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [allStatsHidden, setAllStatsHidden] = useState(false);
  const [hiddenStats, setHiddenStats] = useState<Set<string>>(new Set());

  function toggleStat(key: string) {
    setHiddenStats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function isStatHidden(key: string) { return allStatsHidden || hiddenStats.has(key); }
  function toggleAllStats() {
    setAllStatsHidden((h) => !h);
    setHiddenStats(new Set());
  }

  const activeAccountObj = useAccountStore((s) => s.activeAccount());
  const currency = activeAccountObj?.currency ?? 'Rs.';
  const accountId = activeAccountObj?.id;

  const startDate = format(month, 'yyyy-MM-dd');
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

  const filters = {
    accountId: accountId!,
    startDate,
    endDate,
    limit: 200,
    ...(search.trim() && { search: search.trim() }),
    ...(filterType && { type: filterType }),
    ...(filterCategoryId && { categoryId: Number(filterCategoryId) }),
    ...(filterWalletId && { walletId: Number(filterWalletId) }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', accountId, startDate, endDate, search, filterType, filterCategoryId, filterWalletId],
    queryFn: () => transactionService.list(filters),
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

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', accountId, startDate, endDate],
    queryFn: () => budgetService.getAll(accountId!, startDate, endDate),
    enabled: !!accountId,
  });

  const transactions = data?.data ?? [];
  const groups = groupByDate(transactions);
  const hasActiveFilters = !!(filterType || filterCategoryId || filterWalletId);

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;
  const totalWalletBalance = wallets
    .filter((w) => w.includedInTotal && !w.archived)
    .reduce((s, w) => s + Number(w.currentBalance), 0);
  const includedWalletCount = wallets.filter((w) => w.includedInTotal && !w.archived).length;

  // Top spending categories derived from this month's expenses
  const spendingByCategory = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce<Record<string, { name: string; color: string | null; amount: number; count: number }>>((acc, t) => {
      const id = String(t.categoryId ?? 'other');
      if (!acc[id]) acc[id] = { name: t.category?.name ?? 'Other', color: t.category?.color ?? null, amount: 0, count: 0 };
      acc[id].amount += Number(t.amount);
      acc[id].count += 1;
      return acc;
    }, {});

  const topSpending = Object.values(spendingByCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  async function handleExport() {
    if (!accountId) return;
    setExporting(true);
    try {
      await transactionService.exportCsv(filters);
      toast.success('Export started');
    } catch {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  }

  function clearFilters() {
    setFilterType('');
    setFilterCategoryId('');
    setFilterWalletId('');
  }

  function openAdd() {
    setEditing(undefined);
    setShowModal(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setShowModal(true);
  }

  const TYPE_CHIPS = [
    { label: 'All', value: '' },
    { label: 'Income', value: 'INCOME' },
    { label: 'Expense', value: 'EXPENSE' },
    { label: 'Transfer', value: 'TRANSFER' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0 flex-wrap">
        {/* Month switch */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-1.5 shadow-sm">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[130px] text-center text-sm font-black text-gray-800 tracking-tight">
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Type chips — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-2">
          {TYPE_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilterType(value as TransactionType | '')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                filterType === value
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={cn(
              'w-9 h-9 border rounded-xl flex items-center justify-center transition-colors shadow-sm',
              showSearch
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
            )}
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              'w-9 h-9 border rounded-xl flex items-center justify-center relative transition-colors shadow-sm',
              showFilters || hasActiveFilters
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
            )}
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-9 h-9 border bg-white border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-5 pt-3 pb-1 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advanced filter panel */}
      {showFilters && (
        <div className="px-5 pt-2 pb-1 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterWalletId}
              onChange={(e) => setFilterWalletId(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-1.5 text-xs text-amber-700 hover:underline font-semibold">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Summary stat cards ── */}
      <div className="px-5 pt-4 pb-1 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Summary</p>
          <button
            onClick={toggleAllStats}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            title={allStatsHidden ? 'Show all' : 'Hide all'}
          >
            {allStatsHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{allStatsHidden ? 'Show all' : 'Hide all'}</span>
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Balance */}
          <div className="stat-card flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-1">Total Balance</p>
              <p className={cn('text-lg font-black tracking-tight', totalWalletBalance >= 0 ? 'text-gray-800' : 'text-expense')}>
                {isStatHidden('balance') ? '••••' : formatCurrency(totalWalletBalance, currency)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-bold">{includedWalletCount} wallets</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <div className="w-10 h-10 rounded-[14px] bg-gray-50 flex items-center justify-center text-base z-10">💼</div>
              <button onClick={() => toggleStat('balance')} className="text-gray-300 hover:text-gray-500 transition-colors">
                {isStatHidden('balance') ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          {/* Income */}
          <div className="stat-card flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-1">Income</p>
              <p className="text-lg font-black tracking-tight text-income">
                {isStatHidden('income') ? '••••' : formatCurrency(totalIncome, currency)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-bold">This month</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <div className="w-10 h-10 rounded-[14px] bg-gray-50 flex items-center justify-center text-base z-10">↗</div>
              <button onClick={() => toggleStat('income')} className="text-gray-300 hover:text-gray-500 transition-colors">
                {isStatHidden('income') ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          {/* Expense */}
          <div className="stat-card flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-1">Expense</p>
              <p className="text-lg font-black tracking-tight text-expense">
                {isStatHidden('expense') ? '••••' : formatCurrency(totalExpense, currency)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-bold">This month</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <div className="w-10 h-10 rounded-[14px] bg-gray-50 flex items-center justify-center text-base z-10">↘</div>
              <button onClick={() => toggleStat('expense')} className="text-gray-300 hover:text-gray-500 transition-colors">
                {isStatHidden('expense') ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          {/* Net Total */}
          <div className="stat-card flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-1">Net Total</p>
              <p className={cn('text-lg font-black tracking-tight', netBalance >= 0 ? 'text-success' : 'text-expense')}>
                {isStatHidden('net') ? '••••' : formatCurrency(netBalance, currency)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Income – expense</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <div className="w-10 h-10 rounded-[14px] bg-gray-50 flex items-center justify-center text-base z-10">✓</div>
              <button onClick={() => toggleStat('net')} className="text-gray-300 hover:text-gray-500 transition-colors">
                {isStatHidden('net') ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="flex-1 overflow-hidden px-5 pb-5">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">

          {/* ── Left: Transaction list ── */}
          <div className="glass-card flex flex-col min-h-0 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="text-sm font-black text-gray-800 tracking-tight">Transactions</p>
                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                  Grouped by date · transfer excluded from income/expense
                </p>
              </div>
              {/* Mobile type chips */}
              <div className="flex sm:hidden gap-1.5">
                {TYPE_CHIPS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setFilterType(value as TransactionType | '')}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors',
                      filterType === value
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading…
                </div>
              )}

              {!isLoading && groups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)' }}
                  >
                    <Plus size={26} className="text-amber-500" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No transactions this month</p>
                  <button onClick={openAdd} className="text-amber-700 text-sm font-bold hover:underline">
                    Add your first one
                  </button>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.date}>
                  {/* Day header */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      {group.label}
                    </span>
                    <div className="flex gap-3 text-[11px] font-bold">
                      {group.income > 0 && (
                        <span className="text-income">+{formatCurrency(group.income, currency)}</span>
                      )}
                      {group.expense > 0 && (
                        <span className="text-expense">−{formatCurrency(group.expense, currency)}</span>
                      )}
                    </div>
                  </div>

                  {/* Transaction rows */}
                  <div className="px-4 py-2.5 space-y-2">
                    {group.transactions.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        currency={currency}
                        onClick={() => openEdit(tx)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {groups.length > 0 && (
                <div className="mx-4 mb-4 mt-1 py-3 border border-dashed border-gray-200 rounded-2xl text-center text-xs font-bold text-gray-400 bg-gray-50/50">
                  No more transactions for {format(month, 'MMMM yyyy')}
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 overflow-y-auto">

            {/* Wallet Summary */}
            <div className="bg-white/90 border border-gray-200 rounded-[22px] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-800">Wallet Summary</p>
                <span className="text-xs font-black text-amber-600 cursor-pointer hover:underline">
                  View all
                </span>
              </div>
              <div className="space-y-2.5">
                {wallets.filter((w) => !w.archived).slice(0, 4).map((w) => (
                  <div key={w.id} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-9 h-9 rounded-[14px] bg-amber-50 flex items-center justify-center text-base flex-shrink-0">
                      {WALLET_ICON[w.type] ?? <Wallet size={16} className="text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{w.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold capitalize">
                        {w.type.toLowerCase()} account
                      </p>
                    </div>
                    <p className="text-xs font-black text-gray-800 flex-shrink-0">
                      {formatCurrency(Number(w.currentBalance), currency)}
                    </p>
                  </div>
                ))}
                {wallets.filter((w) => !w.archived).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No wallets yet</p>
                )}
              </div>
            </div>

            {/* Top Spending */}
            <div className="bg-white/90 border border-gray-200 rounded-[22px] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-800">Top Spending</p>
                <span className="text-xs font-black text-gray-400">{format(month, 'MMMM')}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {topSpending.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No expenses this month</p>
                )}
                {topSpending.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2.5 py-2">
                    <div
                      className="w-8 h-8 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.color ?? '#9ca3af' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{cat.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-xs font-black text-expense flex-shrink-0">
                      {formatCurrency(cat.amount, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Progress */}
            {budgets.length > 0 && (
              <div className="bg-white/90 border border-gray-200 rounded-[22px] shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-gray-800">Budget Progress</p>
                  <span className="text-xs font-black text-amber-600 cursor-pointer hover:underline">
                    Manage
                  </span>
                </div>
                <div className="space-y-3">
                  {budgets.slice(0, 4).map((b) => {
                    const pct = Math.min(100, b.percentage);
                    const over = pct >= 100;
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between text-xs font-black mb-1.5">
                          <span className="text-gray-700">{b.category?.name ?? 'Budget'}</span>
                          <span className={over ? 'text-expense' : 'text-gray-500'}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: over
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : 'linear-gradient(90deg, #fbbf24, #f97316)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-[22px] flex items-center justify-center active:scale-95 transition-all"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f97316)',
          boxShadow: '0 18px 40px rgba(217,119,6,0.32)',
          color: '#78350f',
        }}
      >
        <Plus size={26} />
      </button>

      {/* Modal */}
      {showModal && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          onClose={() => setShowModal(false)}
          editing={editing}
        />
      )}
    </div>
  );
}
