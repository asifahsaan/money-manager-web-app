import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, Download, FileText, X, Eye, EyeOff, Briefcase, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '@/stores/account.store';
import { transactionService } from '@/services/transaction.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
import { budgetService } from '@/services/budget.service';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionItem } from './components/TransactionItem';
import { TransactionModal } from './components/TransactionModal';
import { usePrivacy } from '@/lib/use-privacy';
import { StatCard, HideAllButton } from '@/components/shared/StatCard';
import { walletTheme } from '@/lib/wallet-brands';
import { CategoryCombobox } from '@/components/shared/CategoryCombobox';
import { WalletLogo, walletSubtitle } from '@/pages/wallet/components/WalletCard';

const PRIVACY_KEYS = ['balance', 'income', 'expense', 'net', 'wallets'] as const;

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
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const privacy = usePrivacy('mm_tx_hidden', PRIVACY_KEYS);
  const walletSummaryHidden = privacy.isHidden('wallets');

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
    .slice(0, 5);

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
          <HideAllButton allHidden={privacy.allHidden} onClick={privacy.toggleAll} />
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
            onClick={() => navigate(`/statements?month=${format(month, 'yyyy-MM')}`)}
            title="Monthly statement (PDF / CSV)"
            aria-label="Monthly statement"
            className="w-9 h-9 border bg-white border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 shadow-sm transition-colors"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={handleExport}
            title="Export transactions (CSV)"
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
            <CategoryCombobox
              compact
              categories={categories}
              type={filterType === 'INCOME' ? 'INCOME' : filterType === 'EXPENSE' ? 'EXPENSE' : undefined}
              value={filterCategoryId ? Number(filterCategoryId) : ''}
              onChange={(id) => setFilterCategoryId(id ? String(id) : '')}
              emptyLabel="All categories"
            />
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
      <div className="px-4 pt-3 pb-3 flex-shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total balance" icon={Briefcase} tone={totalWalletBalance >= 0 ? 'neutral' : 'expense'}
            value={formatCurrency(totalWalletBalance, currency)} sub={`${includedWalletCount} wallets counted`}
            hidden={privacy.isHidden('balance')} onToggleHidden={() => privacy.toggle('balance')} />
          <StatCard label="Income" icon={TrendingUp} tone="income" loading={isLoading}
            value={formatCurrency(totalIncome, currency)} sub={format(month, 'MMMM yyyy')}
            hidden={privacy.isHidden('income')} onToggleHidden={() => privacy.toggle('income')} />
          <StatCard label="Expense" icon={TrendingDown} tone="expense" loading={isLoading}
            value={formatCurrency(totalExpense, currency)} sub={format(month, 'MMMM yyyy')}
            hidden={privacy.isHidden('expense')} onToggleHidden={() => privacy.toggle('expense')} />
          <StatCard label="Net" icon={PiggyBank} tone={netBalance >= 0 ? 'income' : 'expense'} loading={isLoading}
            value={formatCurrency(netBalance, currency)} sub="Income minus expense"
            hidden={privacy.isHidden('net')} onToggleHidden={() => privacy.toggle('net')} />
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

          {/* ── Left: Transaction list ── */}
          <div className="glass-card flex flex-col min-h-0 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
                </p>
                <p className="text-[11px] text-gray-400">Grouped by day · transfers don't count as income or expense</p>
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
                    style={{ background: 'rgb(var(--c-brand-50))' }}
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
                  <div className="sticky top-0 z-[1] flex items-center justify-between border-y border-gray-100 bg-gray-50/95 px-4 py-1.5 backdrop-blur">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                    <div className="flex gap-3 text-[11px] font-bold">
                      {group.income > 0 && (
                        <span className="text-income">+{privacy.isHidden('income') ? '••••' : formatCurrency(group.income, currency)}</span>
                      )}
                      {group.expense > 0 && (
                        <span className="text-expense">−{privacy.isHidden('expense') ? '••••' : formatCurrency(group.expense, currency)}</span>
                      )}
                    </div>
                  </div>

                  {/* Transaction rows */}
                  <div className="px-2 py-1">
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
                <p className="py-3 text-center text-[11px] text-gray-400">
                  End of {format(month, 'MMMM yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="hidden lg:flex flex-col gap-3 overflow-y-auto">

            {/* Wallet Summary */}
            <div className="card shrink-0 p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-gray-800">Wallet Summary</p>
                  <button
                    onClick={() => privacy.toggle('wallets')}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                    title={walletSummaryHidden ? 'Show balances' : 'Hide balances'}
                  >
                    {walletSummaryHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => navigate('/wallet')}
                  className="text-xs font-black text-amber-600 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-1">
                {wallets.filter((w) => !w.archived).slice(0, 6).map((w) => (
                  <div key={w.id} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-gray-50">
                    <WalletLogo theme={walletTheme(w)} type={w.type} size={32} variant="solid" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{w.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {walletSubtitle(w)}
                      </p>
                    </div>
                    <p className={cn('text-xs font-bold tabular-nums flex-shrink-0', Number(w.currentBalance) < 0 ? 'text-expense' : 'text-gray-800')}>
                      {walletSummaryHidden ? '••••' : formatCurrency(Number(w.currentBalance), currency)}
                    </p>
                  </div>
                ))}
                {wallets.filter((w) => !w.archived).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No wallets yet</p>
                )}
              </div>
            </div>

            {/* Top Spending */}
            <div className="card shrink-0 p-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-800">Top Spending</p>
                <span className="text-xs font-black text-gray-400">{format(month, 'MMMM')}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {topSpending.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No expenses this month</p>
                )}
                {topSpending.map((cat) => {
                  const share = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="py-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color ?? '#9ca3af' }} />
                        <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{cat.name}</span>
                        <span className="text-[10px] text-gray-400">{share.toFixed(2)}%</span>
                        <span className="w-24 text-right font-bold tabular-nums text-expense">
                          {privacy.isHidden('expense') ? '••••' : formatCurrency(cat.amount, currency)}
                        </span>
                      </div>
                      <div className="ml-[18px] mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: cat.color ?? '#9ca3af' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget Progress */}
            {budgets.length > 0 && (
              <div className="card shrink-0 p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-gray-800">Budget Progress</p>
                  <button
                    onClick={() => navigate('/wallet?tab=budget')}
                    className="text-xs font-black text-amber-600 hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="space-y-2.5">
                  {budgets.slice(0, 5).map((b) => {
                    const pct = Math.min(100, b.percentage);
                    const over = pct >= 100;
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-700">{b.category?.name ?? 'Budget'}</span>
                          <span className={over ? 'text-expense' : 'text-gray-500'}>
                            {b.percentage.toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: over
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : 'rgb(var(--c-brand-600))',
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
          background: 'rgb(var(--c-brand-600))',
          boxShadow: '0 18px 40px rgba(79,70,229,0.32)',
          color: '#ffffff',
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
