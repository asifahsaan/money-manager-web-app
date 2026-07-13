import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, subMonths, addMonths,
  startOfYear, endOfYear, isSameMonth,
} from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { statisticsService, CategoryBreakdownItem, TransactionItem } from '@/services/statistics.service';
import { walletService } from '@/services/wallet.service';
import { formatCurrency, cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type Period = 'monthly' | 'quarterly' | 'yearly' | 'custom';

const DONUT_COLORS = [
  '#EF4444', '#3B82F6', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#6B7280', '#84CC16',
];

function resolveIcon(name: string | null): React.ComponentType<LucideProps> {
  if (!name) return LucideIcons.Tag as React.ComponentType<LucideProps>;
  if (name in LucideIcons) {
    const ic = LucideIcons[name as keyof typeof LucideIcons];
    if (typeof ic === 'function') return ic as React.ComponentType<LucideProps>;
  }
  const pascal = name.split('-').map((w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join('');
  if (pascal in LucideIcons) {
    const ic = LucideIcons[pascal as keyof typeof LucideIcons];
    if (typeof ic === 'function') return ic as React.ComponentType<LucideProps>;
  }
  const lower = pascal.toLowerCase();
  const key = Object.keys(LucideIcons).find((k) => k.toLowerCase() === lower);
  if (key) {
    const ic = LucideIcons[key as keyof typeof LucideIcons];
    if (typeof ic === 'function') return ic as React.ComponentType<LucideProps>;
  }
  return LucideIcons.Tag as React.ComponentType<LucideProps>;
}

function abbrev(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function getPeriodDates(period: Period, ref: Date, customStart: string, customEnd: string) {
  switch (period) {
    case 'monthly':
      return {
        startDate: format(startOfMonth(ref), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(ref), 'yyyy-MM-dd'),
        label: format(ref, 'MMMM yyyy'),
        trendMonths: 6,
      };
    case 'quarterly': {
      const q = Math.floor(ref.getMonth() / 3);
      const qStart = new Date(ref.getFullYear(), q * 3, 1);
      const qEnd = endOfMonth(new Date(ref.getFullYear(), q * 3 + 2, 1));
      return {
        startDate: format(qStart, 'yyyy-MM-dd'),
        endDate: format(qEnd, 'yyyy-MM-dd'),
        label: `Q${q + 1} ${ref.getFullYear()}`,
        trendMonths: 6,
      };
    }
    case 'yearly':
      return {
        startDate: format(startOfYear(ref), 'yyyy-MM-dd'),
        endDate: format(endOfYear(ref), 'yyyy-MM-dd'),
        label: format(ref, 'yyyy'),
        trendMonths: 12,
      };
    case 'custom':
      return {
        startDate: customStart,
        endDate: customEnd,
        label: `${customStart} → ${customEnd}`,
        trendMonths: 6,
      };
  }
}

function shiftPeriod(period: Period, ref: Date, dir: 1 | -1): Date {
  switch (period) {
    case 'monthly': return dir === 1 ? addMonths(ref, 1) : subMonths(ref, 1);
    case 'quarterly': return dir === 1 ? addMonths(ref, 3) : subMonths(ref, 3);
    case 'yearly': return new Date(ref.getFullYear() + dir, ref.getMonth(), 1);
    default: return ref;
  }
}

interface RichTx extends TransactionItem {
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
}

export function StatisticsPage() {
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const currency = activeAccount?.currency ?? 'Rs.';
  const accountId = activeAccount?.id;

  const [period, setPeriod] = useState<Period>('monthly');
  const [ref, setRef] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedCat, setSelectedCat] = useState<CategoryBreakdownItem | null>(null);
  const [selectedCatColor, setSelectedCatColor] = useState<string>('#EF4444');
  const [modalTab, setModalTab] = useState<'transactions' | 'groups'>('transactions');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [donutFilter, setDonutFilter] = useState<{ id: number | null; name: string; color: string; amount: number } | null>(null);
  const [incomeFilter, setIncomeFilter] = useState<{ id: number | null; name: string; color: string; amount: number } | null>(null);
  const [showDonutExpense, setShowDonutExpense] = useState(true);
  const [showDonutIncome, setShowDonutIncome] = useState(true);

  const { startDate, endDate, label, trendMonths } = getPeriodDates(period, ref, customStart, customEnd);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['stats-summary', accountId, startDate, endDate],
    queryFn: () => statisticsService.getSummary(accountId!, startDate, endDate),
    enabled: !!accountId && !!startDate && !!endDate,
  });

  const { data: trend = [] } = useQuery({
    queryKey: ['stats-trend', accountId, trendMonths],
    queryFn: () => statisticsService.getTrend(accountId!, trendMonths),
    enabled: !!accountId,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled: !!accountId,
  });

  const totalWalletBalance = wallets
    .filter((w) => w.includedInTotal && !w.archived)
    .reduce((s, w) => s + Number(w.currentBalance), 0);

  const income = summary?.totalIncome ?? 0;
  const expense = summary?.totalExpense ?? 0;
  const net = income - expense;
  const endingBalance = totalWalletBalance;
  const openingBalance = endingBalance - net;

  const expenseBreakdown = summary?.expenseBreakdown ?? [];
  const incomeBreakdown = summary?.incomeBreakdown ?? [];

  const topSpending: RichTx[] = useMemo(() => {
    if (!summary) return [];
    const cats = donutFilter
      ? summary.expenseBreakdown.filter((c) => c.id === donutFilter.id)
      : summary.expenseBreakdown;
    return cats
      .flatMap((cat) => cat.transactions.map((tx) => ({
        ...tx,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
      })))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [summary, donutFilter]);

  const weeklyData = useMemo(() => {
    const empty = [
      { day: 'Mon', amount: 0 }, { day: 'Tue', amount: 0 }, { day: 'Wed', amount: 0 },
      { day: 'Thu', amount: 0 }, { day: 'Fri', amount: 0 }, { day: 'Sat', amount: 0 }, { day: 'Sun', amount: 0 },
    ];
    if (!summary) return empty;
    const cats = donutFilter
      ? summary.expenseBreakdown.filter((c) => c.id === donutFilter.id)
      : summary.expenseBreakdown;
    const txs = cats.flatMap((cat) => cat.transactions);
    const totals: number[] = new Array(7).fill(0);
    txs.forEach((tx) => {
      const d = new Date(tx.date).getDay();
      totals[d] += tx.amount;
    });
    return [
      { day: 'Mon', amount: totals[1] }, { day: 'Tue', amount: totals[2] },
      { day: 'Wed', amount: totals[3] }, { day: 'Thu', amount: totals[4] },
      { day: 'Fri', amount: totals[5] }, { day: 'Sat', amount: totals[6] },
      { day: 'Sun', amount: totals[0] },
    ];
  }, [summary, donutFilter]);

  const trendData = trend.map((t) => ({
    month: t.month.substring(5),
    fullMonth: t.month,
    income: Math.round(t.income),
    expense: Math.round(t.expense),
  }));

  const handleTrendClick = (data: { activePayload?: { payload?: { fullMonth?: string } }[] }) => {
    const m = data?.activePayload?.[0]?.payload?.fullMonth;
    if (m) { setRef(new Date(m + '-01')); setPeriod('monthly'); }
  };

  const canGoForward = period !== 'custom' && !(period === 'monthly' && isSameMonth(ref, new Date()));

  if (!accountId) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          {/* Period tabs */}
          <div className="flex gap-1 bg-white/60 p-1 rounded-2xl border border-gray-100">
            {(['monthly', 'quarterly', 'yearly', 'custom'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all capitalize',
                  period === p ? 'text-amber-800 shadow-sm' : 'text-gray-400 hover:text-gray-600',
                )}
                style={period === p ? { background: 'linear-gradient(135deg, #fef3c7, #fffbeb)', boxShadow: '0 4px 12px rgba(251,191,36,0.18)' } : {}}>
                {p}
              </button>
            ))}
          </div>

          {/* Navigator */}
          {period !== 'custom' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setRef((r) => shiftPeriod(period, r, -1))}
                className="p-1.5 rounded-xl hover:bg-white/60 text-gray-500 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-700 min-w-[90px] text-center">{label}</span>
              <button onClick={() => setRef((r) => shiftPeriod(period, r, 1))} disabled={!canGoForward}
                className={cn('p-1.5 rounded-xl text-gray-500 transition-colors',
                  !canGoForward ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/60')}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-gray-400 flex-shrink-0" />
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 bg-white" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 bg-white" />
          </div>
        )}

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Opening Balance</p>
            <p className={cn('text-base font-black', openingBalance >= 0 ? 'text-gray-800' : 'text-expense')}>
              {isLoading ? '…' : formatCurrency(openingBalance, currency)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Before {label}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Remaining Balance</p>
            <p className={cn('text-base font-black', endingBalance >= 0 ? 'text-gray-800' : 'text-expense')}>
              {formatCurrency(endingBalance, currency)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">After {label}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Income / Expense</p>
            <p className="text-base font-black">
              <span className="text-income">{abbrev(income)}</span>
              <span className="text-gray-300 mx-1">/</span>
              <span className="text-expense">{abbrev(expense)}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Transfers excluded</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Net Total</p>
            <p className={cn('text-base font-black', net >= 0 ? 'text-income' : 'text-expense')}>
              {isLoading ? '…' : formatCurrency(net, currency)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Income minus expense</p>
          </div>
        </div>
      </div>

      {/* ── Expense Structure + Income Structure (50/50) ── */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4 shrink-0">
        <StructurePanel
          title="Expense Structure"
          type="expense"
          breakdown={expenseBreakdown}
          total={expense}
          currency={currency}
          showDonut={showDonutExpense}
          onToggleDonut={() => setShowDonutExpense((v) => !v)}
          onClickCat={(cat, color) => { setSelectedCat(cat); setSelectedCatColor(color); setModalTab('transactions'); setExpandedGroups(new Set()); }}
          donutFilter={donutFilter}
          onDonutClick={(id, name, color, amount) => setDonutFilter((f) => f?.id === id ? null : { id, name, color, amount })}
          chartSize={170}
        />
        <StructurePanel
          title="Income Structure"
          type="income"
          breakdown={incomeBreakdown}
          total={income}
          currency={currency}
          showDonut={showDonutIncome}
          onToggleDonut={() => setShowDonutIncome((v) => !v)}
          onClickCat={(cat, color) => { setSelectedCat(cat); setSelectedCatColor(color); setModalTab('transactions'); setExpandedGroups(new Set()); }}
          donutFilter={incomeFilter}
          onDonutClick={(id, name, color, amount) => setIncomeFilter((f) => f?.id === id ? null : { id, name, color, amount })}
          chartSize={170}
        />
      </div>

      {/* ── Two-column: Top 5 Spending + Weekly Spending ── */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        {/* Top 5 Spending */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">Top 5 Spending</p>
            {donutFilter && (
              <button
                onClick={() => setDonutFilter(null)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: donutFilter.color }}
              >
                {donutFilter.name} · {formatCurrency(donutFilter.amount, currency)} <X size={10} />
              </button>
            )}
          </div>
          {topSpending.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expense data</p>
          ) : (
            <div className="space-y-2.5">
              {topSpending.map((tx, i) => {
                const Icon = resolveIcon(tx.categoryIcon);
                const color = tx.categoryColor ?? DONUT_COLORS[i % DONUT_COLORS.length];
                return (
                  <div key={`${tx.id}-${i}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.08)' }}>
                      <Icon size={14} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {tx.description?.trim() || tx.subcategoryName || tx.categoryName}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {tx.subcategoryName
                          ? `${tx.categoryName} › ${tx.subcategoryName}`
                          : tx.categoryName} • {format(new Date(tx.date), 'MMM d')}
                      </p>
                    </div>
                    <span className="text-sm font-black text-expense flex-shrink-0">
                      -{formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Spending */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">
              Weekly Spending{donutFilter ? ` — ${donutFilter.name} (${formatCurrency(donutFilter.amount, currency)})` : ''}
            </p>
            <span className="text-[10px] text-gray-400">Mon–Sun</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={weeklyData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(v: number) => formatCurrency(v, currency)}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="#FCA5A5" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Income vs Expense Trend ── */}
      <div className="px-4 pb-6 shrink-0">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-800">Income vs Expense Trend</h3>
            <span className="text-[10px] text-gray-400">Click bar → jump to month</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={trendData} barSize={10} barGap={2} onClick={handleTrendClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(value: number) => formatCurrency(value, currency)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" radius={[4, 4, 0, 0]} name="Income">
                {trendData.map((e, i) => (
                  <Cell key={i} fill={isSameMonth(new Date(e.fullMonth + '-01'), ref) ? '#059669' : '#10B981'} />
                ))}
              </Bar>
              <Bar dataKey="expense" radius={[4, 4, 0, 0]} name="Expense">
                {trendData.map((e, i) => (
                  <Cell key={i} fill={isSameMonth(new Date(e.fullMonth + '-01'), ref) ? '#B91C1C' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Category Detail Modal ── */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedCat(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              {(() => {
                const Icon = resolveIcon(selectedCat.icon);
                return (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: selectedCatColor, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.1)' }}>
                    <Icon size={16} color="white" />
                  </div>
                );
              })()}
              <h2 className="flex-1 text-sm font-bold text-gray-800">{selectedCat.name} Breakdown</h2>
              <button onClick={() => setSelectedCat(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Modal stat chips */}
            <div className="flex gap-2 px-5 pt-4 pb-3 shrink-0">
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-0.5">Total expense</p>
                <p className="text-sm font-black text-expense">{formatCurrency(selectedCat.amount, currency)}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-0.5">Transactions</p>
                <p className="text-sm font-black text-gray-800">{selectedCat.transactions.length}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-0.5">Average</p>
                <p className="text-sm font-black text-gray-800">
                  {selectedCat.transactions.length > 0
                    ? formatCurrency(selectedCat.amount / selectedCat.transactions.length, currency)
                    : '—'}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 px-5 pb-3 shrink-0">
              {(['transactions', 'groups'] as const).map((t) => (
                <button key={t} onClick={() => { setModalTab(t); setExpandedGroups(new Set()); }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all capitalize',
                    modalTab === t ? 'text-amber-800 shadow-sm' : 'text-gray-400 hover:text-gray-600',
                  )}
                  style={modalTab === t ? { background: 'linear-gradient(135deg,#fef3c7,#fffbeb)', boxShadow: '0 4px 12px rgba(251,191,36,.18)' } : {}}>
                  {t}
                </button>
              ))}
            </div>

            {/* Transaction list / Groups list */}
            <div className="overflow-y-auto flex-1 px-5 pb-5">
              {selectedCat.transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No transactions</p>
              ) : modalTab === 'transactions' ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Transactions in {selectedCat.name}
                  </p>
                  {selectedCat.transactions.map((tx) => {
                    const Icon = resolveIcon(selectedCat.icon);
                    return (
                      <div key={tx.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: selectedCatColor, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.08)' }}>
                          <Icon size={13} color="white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {tx.description?.trim() || tx.subcategoryName || selectedCat.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {tx.subcategoryName
                              ? `${selectedCat.name} › ${tx.subcategoryName}`
                              : selectedCat.name} • {format(new Date(tx.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className="text-sm font-black text-expense flex-shrink-0">
                          -{formatCurrency(tx.amount, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Groups view ── */
                (() => {
                  // Group by: subcategoryName → description → category name (as fallback label)
                  const groupMap = new Map<string, { label: string; total: number; count: number; txs: typeof selectedCat.transactions }>();
                  for (const tx of selectedCat.transactions) {
                    const key = tx.subcategoryName || tx.description?.trim() || selectedCat.name;
                    if (!groupMap.has(key)) groupMap.set(key, { label: key, total: 0, count: 0, txs: [] });
                    const g = groupMap.get(key)!;
                    g.total += tx.amount;
                    g.count += 1;
                    g.txs.push(tx);
                  }
                  const groups = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);
                  const Icon = resolveIcon(selectedCat.icon);
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {groups.length} group{groups.length !== 1 ? 's' : ''} in {selectedCat.name}
                      </p>
                      {groups.map((g) => {
                        const isOpen = expandedGroups.has(g.label);
                        return (
                          <div key={g.label} className="rounded-xl overflow-hidden border border-gray-100">
                            {/* Group header */}
                            <button
                              className="w-full flex items-center gap-3 bg-gray-50 px-3 py-2.5 hover:bg-gray-100 transition-colors"
                              onClick={() => setExpandedGroups((prev) => {
                                const next = new Set(prev);
                                isOpen ? next.delete(g.label) : next.add(g.label);
                                return next;
                              })}
                            >
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: selectedCatColor, boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.08)' }}>
                                <Icon size={13} color="white" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{g.label}</p>
                                <p className="text-[10px] text-gray-400">{g.count} transaction{g.count !== 1 ? 's' : ''}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black text-expense">-{formatCurrency(g.total, currency)}</p>
                                <p className="text-[10px] text-gray-400">{isOpen ? '▲' : '▼'}</p>
                              </div>
                            </button>
                            {/* Expanded transactions */}
                            {isOpen && (
                              <div className="divide-y divide-gray-50">
                                {g.txs.map((tx) => (
                                  <div key={tx.id} className="flex items-center gap-3 bg-white px-3 py-2">
                                    <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCatColor }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold text-gray-700 truncate">
                                        {tx.description?.trim() || tx.subcategoryName || selectedCat.name}
                                      </p>
                                      <p className="text-[10px] text-gray-400">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
                                    </div>
                                    <span className="text-xs font-bold text-expense flex-shrink-0">
                                      -{formatCurrency(tx.amount, currency)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Structure Panel (Expense or Income) ─── */
function StructurePanel({
  title, type, breakdown, total, currency, showDonut, onToggleDonut, onClickCat, donutFilter, onDonutClick, chartSize = 130,
}: {
  title: string;
  type: 'expense' | 'income';
  breakdown: CategoryBreakdownItem[];
  total: number;
  currency: string;
  showDonut: boolean;
  onToggleDonut: () => void;
  onClickCat: (cat: CategoryBreakdownItem, color: string) => void;
  donutFilter: { id: number | null; name: string; color: string; amount: number } | null;
  onDonutClick: (id: number | null, name: string, color: string, amount: number) => void;
  chartSize?: number;
}) {
  const pieData = breakdown.slice(0, 8).map((c, i) => ({
    name: c.name,
    value: c.amount,
    color: c.color ?? DONUT_COLORS[i % DONUT_COLORS.length],
    id: c.id,
  }));

  const typeColor = type === 'expense' ? '#EF4444' : '#10B981';

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <button onClick={onToggleDonut}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700 transition-colors">
          {showDonut ? 'List view' : 'Donut view'}
        </button>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No data</p>
      ) : (
        <div className={cn('gap-4', showDonut ? 'flex items-center' : 'block')}>
          {/* Donut */}
          {showDonut && pieData.length > 0 && (
            <div className="relative flex-shrink-0" style={{ width: chartSize, height: chartSize }}>
              <PieChart width={chartSize} height={chartSize}>
                <Pie data={pieData} cx={chartSize / 2} cy={chartSize / 2}
                  innerRadius={chartSize * 0.32} outerRadius={chartSize * 0.46}
                  paddingAngle={2} dataKey="value" strokeWidth={0}
                  cursor="pointer"
                  onClick={(entry) => onDonutClick(entry.id, entry.name, entry.color, entry.value)}>
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={donutFilter && donutFilter.id !== entry.id ? 0.3 : 1}
                      stroke={donutFilter?.id === entry.id ? '#fff' : 'none'}
                      strokeWidth={donutFilter?.id === entry.id ? 2 : 0}
                    />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
                <p className="text-[10px] text-gray-400 leading-tight capitalize truncate max-w-full">
                  {donutFilter ? donutFilter.name : type}
                </p>
                <p className="text-sm font-black text-gray-800 leading-tight" style={{ color: donutFilter?.color ?? typeColor }}>
                  {formatCurrency(donutFilter ? donutFilter.amount : total, currency)}
                </p>
              </div>
            </div>
          )}

          {/* Category list */}
          <div className="flex-1 min-w-0 space-y-1">
            {breakdown.map((cat, i) => {
              const color = cat.color ?? DONUT_COLORS[i % DONUT_COLORS.length];
              const Icon = resolveIcon(cat.icon);
              const dimmed = donutFilter && donutFilter.id !== cat.id;
              return (
                <button key={`${cat.id}-${i}`} onClick={() => onClickCat(cat, color)}
                  className={cn('w-full grid grid-cols-[2px_24px_1fr] items-center gap-2 py-1.5 rounded-lg px-1 hover:bg-gray-50 transition-all', dimmed && 'opacity-30')}>
                  {/* Color indicator */}
                  <div className="h-8 rounded-full" style={{ backgroundColor: color }} />
                  {/* Icon */}
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color, boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.1)' }}>
                    <Icon size={11} color="white" />
                  </div>
                  {/* Content */}
                  <div className="text-left min-w-0">
                    <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                      <span className="text-[11px] font-bold text-gray-800 truncate">{cat.name}</span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2 mt-0.5">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">
                        {cat.percentage.toFixed(0)}% · {cat.transactions.length} tx
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
