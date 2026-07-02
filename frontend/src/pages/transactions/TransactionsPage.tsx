import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, Download, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { useAccountStore } from '@/stores/account.store';
import { transactionService } from '@/services/transaction.service';
import { walletService } from '@/services/wallet.service';
import { categoryService } from '@/services/category.service';
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

  return (
    <div className="flex flex-col h-full relative">
      {/* Month navigator */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          className="p-2 rounded-xl hover:bg-white/60 text-gray-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold text-gray-800">
          {format(month, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={cn(
              'p-1.5 rounded-xl transition-colors',
              showSearch ? 'text-primary-700 bg-primary-50' : 'text-gray-500 hover:bg-white/60',
            )}
            title="Search"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              'p-1.5 rounded-xl relative transition-colors',
              showFilters || hasActiveFilters
                ? 'text-primary-700 bg-primary-50'
                : 'text-gray-500 hover:bg-white/60',
            )}
            title="Filter"
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-white/60 transition-colors disabled:opacity-50"
            title="Export CSV"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="p-2 rounded-xl hover:bg-white/60 text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/80 border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white/80 focus:outline-none focus:border-primary-400"
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white/80 focus:outline-none focus:border-primary-400"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filterWalletId}
              onChange={(e) => setFilterWalletId(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white/80 focus:outline-none focus:border-primary-400"
            >
              <option value="">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary-700 hover:underline font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pb-4">
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1.5">Total Balance</p>
          <p
            className={cn(
              'text-lg font-black',
              totalWalletBalance >= 0 ? 'text-gray-800' : 'text-expense',
            )}
          >
            {formatCurrency(totalWalletBalance, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{includedWalletCount} wallets</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1.5">Income</p>
          <p className="text-lg font-black text-income">
            {formatCurrency(totalIncome, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">This month</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1.5">Expense</p>
          <p className="text-lg font-black text-expense">
            {formatCurrency(totalExpense, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">This month</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1.5">Net Total</p>
          <p
            className={cn(
              'text-lg font-black',
              netBalance >= 0 ? 'text-success' : 'text-expense',
            )}
          >
            {formatCurrency(netBalance, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Income – expense</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading…
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)' }}>
              <Plus size={28} className="text-amber-500" />
            </div>
            <p className="text-gray-400 text-sm">No transactions this month</p>
            <button
              onClick={openAdd}
              className="text-primary-700 text-sm font-semibold hover:underline"
            >
              Add your first one
            </button>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date} className="mb-1">
            {/* Day header */}
            <div className="flex items-center justify-between px-5 py-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {group.label}
              </span>
              <div className="flex gap-3 text-xs font-semibold">
                {group.income > 0 && (
                  <span className="text-income">
                    +{formatCurrency(group.income, currency)}
                  </span>
                )}
                {group.expense > 0 && (
                  <span className="text-expense">
                    -{formatCurrency(group.expense, currency)}
                  </span>
                )}
              </div>
            </div>

            {/* Transaction cards */}
            <div className="px-4 space-y-2.5 pb-1">
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

        {/* Bottom padding for FAB */}
        <div className="h-24" />
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
