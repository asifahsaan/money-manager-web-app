import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Wallet as WalletIcon,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeft,
  LucideIcon,
} from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { walletService } from '@/services/wallet.service';
import { transactionService } from '@/services/transaction.service';
import { Transaction, WalletType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionItem } from '@/pages/transactions/components/TransactionItem';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';

const TYPE_ICON: Record<WalletType, LucideIcon> = {
  CASH: Banknote,
  BANK: WalletIcon,
  CARD: CreditCard,
  E_WALLET: Smartphone,
  OTHER: WalletIcon,
};

function groupByDate(txs: Transaction[]): { date: string; txs: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = tx.date.substring(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries())
    .map(([date, txs]) => ({ date, txs }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const currency = activeAccount?.currency ?? 'Rs.';
  const accountId = activeAccount?.id;

  const walletId = Number(id);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const startDate = format(month, 'yyyy-MM-dd');
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet', walletId],
    queryFn: () => walletService.get(walletId),
    enabled: !!walletId,
  });

  const { data, isLoading: loadingTxs } = useQuery({
    queryKey: ['transactions', accountId, startDate, endDate, walletId],
    queryFn: () =>
      transactionService.list({
        accountId: accountId!,
        walletId,
        startDate,
        endDate,
        limit: 200,
      }),
    enabled: !!accountId && !!walletId,
  });

  const transactions = data?.data ?? [];

  // Compute totals for this wallet
  const income = transactions
    .filter((tx) => tx.type === 'INCOME')
    .reduce((s, tx) => s + Number(tx.amount), 0);
  const expense = transactions
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((s, tx) => s + Number(tx.amount), 0);
  const balance = income - expense;

  const grouped = groupByDate(transactions);

  const TypeIcon = wallet ? (TYPE_ICON[wallet.type] ?? WalletIcon) : WalletIcon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="text-white px-4 py-5"
        style={{
          background: wallet?.color
            ? `linear-gradient(135deg, ${wallet.color}dd, ${wallet.color}99)`
            : 'linear-gradient(135deg, #FBBF24dd, #F59E0B99)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/wallet')}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <TypeIcon size={20} color="white" />
            </div>
            <div>
              <p className="font-semibold text-base">
                {loadingWallet ? '...' : wallet?.name}
              </p>
              <p className="text-xs opacity-70">
                {wallet?.type?.toLowerCase().replace('_', '-') ?? ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Balance</p>
            <p className="text-xl font-bold">
              {wallet ? formatCurrency(Number(wallet.currentBalance), currency) : '...'}
            </p>
          </div>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-0 bg-white/10 rounded-xl overflow-hidden">
          <div className="flex flex-col items-center py-3">
            <span className="text-[10px] opacity-60 uppercase tracking-wide">Income</span>
            <span className="text-sm font-semibold mt-0.5">
              +{formatCurrency(income, currency)}
            </span>
          </div>
          <div className="flex flex-col items-center py-3 border-x border-white/20">
            <span className="text-[10px] opacity-60 uppercase tracking-wide">Expense</span>
            <span className="text-sm font-semibold mt-0.5">
              -{formatCurrency(expense, currency)}
            </span>
          </div>
          <div className="flex flex-col items-center py-3">
            <span className="text-[10px] opacity-60 uppercase tracking-wide">Net</span>
            <span className={cn('text-sm font-semibold mt-0.5', balance < 0 && 'text-red-200')}>
              {formatCurrency(balance, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-800">{format(month, 'MMMM yyyy')}</span>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto">
        {loadingTxs && (
          <div className="text-center text-gray-400 text-sm py-10">Loading...</div>
        )}

        {!loadingTxs && transactions.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            No transactions this month
          </div>
        )}

        {grouped.map(({ date, txs }) => {
          const dayIncome = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
          const dayExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

          return (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">
                  {format(new Date(date + 'T00:00:00'), 'EEE, d MMM')}
                </span>
                <div className="flex gap-3 text-xs">
                  {dayIncome > 0 && (
                    <span className="text-income">+{formatCurrency(dayIncome, currency)}</span>
                  )}
                  {dayExpense > 0 && (
                    <span className="text-expense">-{formatCurrency(dayExpense, currency)}</span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {txs.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    currency={currency}
                    onClick={() => setEditingTx(tx)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit transaction modal */}
      {editingTx && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          editing={editingTx}
          onClose={() => {
            setEditingTx(null);
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
            queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
            queryClient.invalidateQueries({ queryKey: ['wallets', accountId] });
          }}
        />
      )}
    </div>
  );
}
