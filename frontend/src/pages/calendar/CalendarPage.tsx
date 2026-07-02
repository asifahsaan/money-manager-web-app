import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { transactionService } from '@/services/transaction.service';
import { Transaction } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { TransactionItem } from '@/pages/transactions/components/TransactionItem';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';

type DayData = {
  income: number;
  expense: number;
  txs: Transaction[];
};

function txDateKey(dateStr: string): string {
  // Handles "2026-06-29", "2026-06-29T00:00:00.000Z", "2026-06-29T19:00:00+05:00"
  if (dateStr.length === 10) return dateStr;
  // Parse as local date using the date portion only
  return dateStr.substring(0, 10);
}

function buildDayMap(txs: Transaction[]): Map<string, DayData> {
  const map = new Map<string, DayData>();
  for (const tx of txs) {
    const key = txDateKey(tx.date);
    if (!map.has(key)) map.set(key, { income: 0, expense: 0, txs: [] });
    const d = map.get(key)!;
    if (tx.type === 'INCOME') d.income += Number(tx.amount);
    else if (tx.type === 'EXPENSE') d.expense += Number(tx.amount);
    d.txs.push(tx);
  }
  return map;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const queryClient = useQueryClient();
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const currency = activeAccount?.currency ?? 'Rs.';
  const accountId = activeAccount?.id;

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);

  const startDate = format(month, 'yyyy-MM-dd');
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data, isLoading: calLoading } = useQuery({
    queryKey: ['calendar-transactions', accountId, startDate, endDate],
    queryFn: () =>
      transactionService.list({ accountId: accountId!, startDate, endDate, limit: 1000, page: 1 }),
    enabled: !!accountId,
  });

  const transactions = data?.data ?? [];
  const dayMap = buildDayMap(transactions);

  const totalMonthIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalMonthExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalNet = totalMonthIncome - totalMonthExpense;

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedData = selectedKey ? dayMap.get(selectedKey) : null;

  function compact(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Month navigator */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => { setMonth(subMonths(month, 1)); setSelectedDay(null); }}
          className="p-2 rounded-xl hover:bg-white/60 text-gray-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-gray-800">
            {format(month, 'MMMM yyyy')}
          </span>
        </div>
        <button
          onClick={() => { setMonth(addMonths(month, 1)); setSelectedDay(null); }}
          className="p-2 rounded-xl hover:bg-white/60 text-gray-600 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pb-4">
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Month</p>
          <p className="text-sm font-black text-gray-800">{format(month, 'MMM yyyy')}</p>
          <p className="text-[10px] text-gray-400 mt-1">Calendar view</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Income</p>
          <p className="text-sm font-black text-income">{formatCurrency(totalMonthIncome, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-1">This month</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Expense</p>
          <p className="text-sm font-black text-expense">{formatCurrency(totalMonthExpense, currency)}</p>
          <p className="text-[10px] text-gray-400 mt-1">This month</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Net</p>
          <p className={cn('text-sm font-black', totalNet >= 0 ? 'text-success' : 'text-expense')}>
            {formatCurrency(totalNet, currency)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Income – expense</p>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={cn('grid grid-cols-7 px-2 pb-2 gap-1.5', calLoading && 'opacity-50')}>
        {calDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayData = dayMap.get(key);
          const inMonth = isSameMonth(day, month);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const todayDay = isToday(day);

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={cn(
                'min-h-[80px] rounded-2xl p-2 flex flex-col items-center gap-0.5 border transition-all',
                !inMonth && 'opacity-30',
                isSelected
                  ? 'border-amber-400 bg-amber-50 shadow-[0_0_0_2px_#fbbf24]'
                  : todayDay
                  ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                  : 'border-gray-100 bg-white hover:border-amber-200 hover:bg-amber-50/30',
              )}
            >
              <span
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold',
                  todayDay
                    ? 'bg-amber-400 text-white shadow-[0_4px_10px_rgba(251,191,36,0.4)]'
                    : isSelected
                    ? 'text-amber-700'
                    : 'text-gray-700',
                )}
              >
                {format(day, 'd')}
              </span>

              {dayData && (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  {dayData.income > 0 && (
                    <span className="text-[9px] text-income font-semibold leading-none truncate w-full text-center">
                      +{compact(dayData.income)}
                    </span>
                  )}
                  {dayData.expense > 0 && (
                    <span className="text-[9px] text-expense font-semibold leading-none truncate w-full text-center">
                      -{compact(dayData.expense)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day transactions */}
      {selectedDay && (
        <div className="mx-4 mb-4">
          <div className="glass-card">
            {/* Day header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <span className="text-sm font-bold text-gray-800">
                  {format(selectedDay, 'EEEE, d MMMM')}
                </span>
                {selectedData && (
                  <div className="flex gap-3 mt-0.5">
                    {selectedData.income > 0 && (
                      <span className="text-xs text-income font-semibold">
                        +{formatCurrency(selectedData.income, currency)}
                      </span>
                    )}
                    {selectedData.expense > 0 && (
                      <span className="text-xs text-expense font-semibold">
                        -{formatCurrency(selectedData.expense, currency)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAddingDate(format(selectedDay, 'yyyy-MM-dd'))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#78350f',
                    boxShadow: '0 6px 16px rgba(217,119,6,0.25)',
                  }}
                >
                  <Plus size={13} />
                  Add
                </button>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Transactions */}
            {!selectedData || selectedData.txs.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <p className="text-gray-400 text-sm">No transactions on this day</p>
                <button
                  onClick={() => setAddingDate(format(selectedDay, 'yyyy-MM-dd'))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
                >
                  <Plus size={15} />
                  Add transaction
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2.5">
                {selectedData.txs.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    currency={currency}
                    onClick={() => setEditingTx(tx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no day selected */}
      {!selectedDay && (
        <div className="flex-1 flex items-center justify-center pb-8">
          <p className="text-gray-400 text-sm">Tap a day to see transactions</p>
        </div>
      )}

      {/* Transaction modal — add */}
      {addingDate && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          defaultDate={addingDate}
          onClose={() => {
            setAddingDate(null);
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
          }}
        />
      )}

      {/* Transaction modal — edit */}
      {editingTx && accountId && (
        <TransactionModal
          accountId={accountId}
          currency={currency}
          editing={editingTx}
          onClose={() => {
            setEditingTx(null);
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
          }}
        />
      )}
    </div>
  );
}
