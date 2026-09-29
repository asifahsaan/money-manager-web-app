import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BarChart3, LineChart as LineChartIcon,
  ArrowDownRight, ArrowUpRight, ChevronRight, Eye, EyeOff, PiggyBank, Plus, Target, TrendingDown, TrendingUp,
  Wallet as WalletIcon, CalendarClock, MessageCircle, type LucideIcon,
} from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { useAuthStore } from '@/stores/auth.store';
import { useQuickAddStore } from '@/stores/quick-add.store';
import { walletService } from '@/services/wallet.service';
import { statisticsService, type CategoryBreakdownItem } from '@/services/statistics.service';
import { transactionService } from '@/services/transaction.service';
import { budgetService } from '@/services/budget.service';
import { goalService } from '@/services/goal.service';
import { debtService } from '@/services/debt.service';
import { dueLabel, dueStatus, urgentDebts } from '@/lib/debt-reminders';
import { DebtReminderModal } from '@/pages/wallet/components/DebtReminderModal';
import { TransactionItem } from '@/pages/transactions/components/TransactionItem';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';
import { CategoryBreakdownModal } from './CategoryBreakdownModal';
import type { Debt, Transaction } from '@/types';
import { CategoryIcon } from '@/pages/transactions/components/CategoryIcon';
import { CHART, chartChrome } from '@/lib/chart-colors';
import { cn, formatCurrency } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme.store';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Compact axis labels: 185000 → 185k, 1250000 → 1.3M
function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('card flex flex-col', className)}>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="flex-1 px-5 pb-5">{children}</div>
    </section>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-primary-600 hover:text-primary-700">
      View all <ChevronRight size={14} />
    </Link>
  );
}

function Delta({ current, previous, goodWhenUp }: { current: number; previous: number; goodWhenUp: boolean }) {
  if (!previous) return <span className="text-xs text-white/75">No data last month</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-1.5 text-xs text-white/80">
      <span
        className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 font-semibold text-white"
        title={good ? 'Better than last month' : 'Worse than last month'}
      >
        <Icon size={13} />
        {Math.abs(pct).toFixed(0)}%
      </span>
      vs last month
    </span>
  );
}

const MASK = '••••••';
const KPI_KEYS = ['networth', 'income', 'expense', 'saved'] as const;
type KpiKey = (typeof KPI_KEYS)[number];
const HIDDEN_KEY = 'mm_ov_hidden';
const CHART_TYPE_KEY = 'mm_ov_chart';

function readHidden(): Set<KpiKey> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as KpiKey[]);
  } catch {
    return new Set();
  }
}

function KpiCard({
  title, icon: Icon, gradient, value, loading, hidden, onToggle, footer, className,
}: {
  title: string;
  icon: LucideIcon;
  gradient: string;
  value: string;
  loading: boolean;
  hidden: boolean;
  onToggle: () => void;
  footer: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm', gradient, className)}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-white/85">
          <Icon size={16} /> {title}
        </span>
        <button
          onClick={onToggle}
          aria-label={hidden ? `Show ${title}` : `Hide ${title}`}
          className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-36 animate-pulse rounded-md bg-white/20" />
      ) : (
        <p className="relative mt-2 text-[26px] font-bold leading-tight tracking-tight tabular-nums lg:text-[22px] xl:text-[28px]">
          {hidden ? MASK : value}
        </p>
      )}
      <div className="relative mt-1.5">{footer}</div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function OverviewPage() {
  const accountId = useAccountStore((s) => s.activeAccountId);
  const account = useAccountStore((s) => s.accounts.find((a) => a.id === s.activeAccountId));
  const user = useAuthStore((s) => s.user);
  const openQuickAdd = useQuickAddStore((s) => s.setOpen);
  useThemeStore((s) => s.preference); // re-render charts when the theme changes
  const currency = account?.currency ?? 'Rs.';
  const money = (n: number) => formatCurrency(n, currency);

  const [hidden, setHidden] = useState<Set<KpiKey>>(readHidden);
  const allHidden = KPI_KEYS.every((k) => hidden.has(k));
  const saveHidden = (next: Set<KpiKey>) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };
  const toggle = (k: KpiKey) => {
    const next = new Set(hidden);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    saveHidden(next);
  };
  const toggleAll = () => saveHidden(allHidden ? new Set() : new Set(KPI_KEYS));

  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>(() => {
    try {
      return localStorage.getItem(CHART_TYPE_KEY) === 'line' ? 'line' : 'bar';
    } catch {
      return 'bar';
    }
  });
  const changeChartType = (t: 'bar' | 'line') => {
    setChartType(t);
    try {
      localStorage.setItem(CHART_TYPE_KEY, t);
    } catch {
      // ignore
    }
  };
  const openTransactionById = (id: number) => {
    transactionService
      .get(id)
      .then((tx) => {
        setBreakdown(null);
        setOpenTx(tx);
      })
      .catch(() => toast.error('Could not open transaction'));
  };

  const now = new Date();
  const monthStart = ymd(startOfMonth(now));
  const monthEnd = ymd(endOfMonth(now));
  const prev = subMonths(now, 1);
  const prevStart = ymd(startOfMonth(prev));
  const prevEnd = ymd(endOfMonth(prev));
  const enabled = !!accountId;

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId!),
    enabled,
  });
  const { data: month, isLoading: monthLoading } = useQuery({
    queryKey: ['stats-summary', accountId, monthStart, monthEnd],
    queryFn: () => statisticsService.getSummary(accountId!, monthStart, monthEnd),
    enabled,
  });
  const { data: lastMonth } = useQuery({
    queryKey: ['stats-summary', accountId, prevStart, prevEnd],
    queryFn: () => statisticsService.getSummary(accountId!, prevStart, prevEnd),
    enabled,
  });
  const { data: trend } = useQuery({
    queryKey: ['stats-trend', accountId, 6],
    queryFn: () => statisticsService.getTrend(accountId!, 6),
    enabled,
  });
  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['transactions', accountId, 'overview-recent'],
    queryFn: () => transactionService.list({ accountId: accountId!, limit: 6, page: 1 }),
    enabled,
  });
  const { data: budgets } = useQuery({
    queryKey: ['budgets', accountId, monthStart, monthEnd],
    queryFn: () => budgetService.getAll(accountId!, monthStart, monthEnd),
    enabled,
  });
  const { data: debts = [] } = useQuery({
    queryKey: ['debts', accountId],
    queryFn: () => debtService.getAll(accountId!),
    enabled,
  });
  const dueDebts = urgentDebts(debts);
  const [remindDebt, setRemindDebt] = useState<Debt | null>(null);

  const { data: goals } = useQuery({
    queryKey: ['goals', accountId],
    queryFn: () => goalService.getAll(accountId!),
    enabled,
  });

  const activeWallets = useMemo(() => (wallets ?? []).filter((w) => !w.archived), [wallets]);
  const netWorth = activeWallets.filter((w) => w.includedInTotal).reduce((s, w) => s + Number(w.currentBalance), 0);
  const income = month?.totalIncome ?? 0;
  const expense = month?.totalExpense ?? 0;
  const saved = income - expense;
  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : null;
  const chrome = chartChrome();

  const chartData = (trend ?? []).map((m) => ({
    label: format(parseISO(`${m.month}-01`), 'MMM'),
    Income: m.income,
    Expense: m.expense,
  }));
  const allCategories = month?.expenseBreakdown ?? [];
  const topCategories = showAllCats ? allCategories : allCategories.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{format(now, 'EEEE, d MMMM')}</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
            {greeting()}, {user?.name.split(' ')[0] ?? 'there'}
          </h2>
        </div>
        <button
          onClick={() => openQuickAdd(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 md:hidden"
        >
          <Plus size={16} strokeWidth={2.5} /> Add
        </button>
      </div>

      {/* KPIs */}
      <div>
        <div className="mb-2 flex justify-end">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
          >
            {allHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {allHidden ? 'Show all' : 'Hide all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <KpiCard
            title="Net worth"
            icon={WalletIcon}
            gradient="from-primary-600 to-violet-600"
            className="col-span-2 lg:col-span-1"
            value={money(netWorth)}
            loading={walletsLoading}
            hidden={hidden.has('networth')}
            onToggle={() => toggle('networth')}
            footer={<p className="text-xs text-white/80">Across {activeWallets.filter((w) => w.includedInTotal).length} wallets</p>}
          />
          <KpiCard
            title="Income"
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-600"
            className="col-span-2 sm:col-span-1"
            value={money(income)}
            loading={monthLoading}
            hidden={hidden.has('income')}
            onToggle={() => toggle('income')}
            footer={<Delta current={income} previous={lastMonth?.totalIncome ?? 0} goodWhenUp />}
          />
          <KpiCard
            title="Expenses"
            icon={TrendingDown}
            gradient="from-rose-500 to-pink-600"
            className="col-span-2 sm:col-span-1"
            value={money(expense)}
            loading={monthLoading}
            hidden={hidden.has('expense')}
            onToggle={() => toggle('expense')}
            footer={<Delta current={expense} previous={lastMonth?.totalExpense ?? 0} goodWhenUp={false} />}
          />
          <KpiCard
            title="Saved this month"
            icon={PiggyBank}
            gradient="from-sky-500 to-blue-600"
            className="col-span-2 lg:col-span-1"
            value={money(saved)}
            loading={monthLoading}
            hidden={hidden.has('saved')}
            onToggle={() => toggle('saved')}
            footer={
              savingsRate !== null ? (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-white/80">
                    {savingsRate >= 0 ? `${savingsRate}% of income saved` : 'Spent more than earned'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/80">No income yet this month</p>
              )
            }
          />
        </div>
      </div>

      {dueDebts.length > 0 && (
        <section className="card" aria-label="Debts due">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock size={16} className="text-orange-500" /> Debts due
            </h2>
            <ViewAll to="/wallet?tab=debt" />
          </div>
          <ul className="divide-y divide-gray-100 px-5 pb-2">
            {dueDebts.slice(0, 4).map((d) => {
              const overdue = dueStatus(d).kind === 'overdue';
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {d.type === 'RECEIVABLE' ? 'Collect from ' : 'Pay back '}{d.personName}
                    </p>
                    <p className={cn('text-xs font-medium', overdue ? 'text-red-600' : 'text-orange-600')}>{dueLabel(d)}</p>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', d.type === 'RECEIVABLE' ? 'text-income' : 'text-expense')}>
                    {money(Number(d.remainingAmount))}
                  </span>
                  <button
                    onClick={() => setRemindDebt(d)}
                    className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#25D366' }}
                  >
                    <MessageCircle size={13} /> Remind
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Cash flow */}
        <Section
          title="Cash flow"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full" style={{ background: CHART.income }} />Income</span>
              <span className="hidden items-center gap-1.5 sm:flex"><span className="h-2 w-2 rounded-full" style={{ background: CHART.expense }} />Expense</span>
              <div className="flex rounded-lg bg-gray-100 p-0.5" role="radiogroup" aria-label="Chart type">
                {([['bar', BarChart3, 'Bar chart'], ['line', LineChartIcon, 'Line chart']] as const).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={chartType === t}
                    aria-label={label}
                    title={label}
                    onClick={() => changeChartType(t)}
                    className={cn(
                      'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
                      chartType === t ? 'bg-surface text-primary-600 shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="h-64">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chrome.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: chrome.axis, fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: chrome.axis, fontSize: 12 }} tickFormatter={compact} width={48} />
                    <Tooltip
                      cursor={{ fill: chrome.grid, opacity: 0.4 }}
                      formatter={(v: number) => money(v)}
                      contentStyle={{ background: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: chrome.axis }}
                    />
                    <Bar dataKey="Income" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Expense" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ov-income" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.income} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CHART.income} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ov-expense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.expense} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART.expense} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={chrome.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: chrome.axis, fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: chrome.axis, fontSize: 12 }} tickFormatter={compact} width={48} />
                    <Tooltip
                      cursor={{ stroke: chrome.grid }}
                      formatter={(v: number) => money(v)}
                      contentStyle={{ background: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: chrome.axis }}
                    />
                    <Area type="monotone" dataKey="Income" stroke={CHART.income} strokeWidth={2.5} fill="url(#ov-income)" dot={{ r: 3, strokeWidth: 0, fill: CHART.income }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="Expense" stroke={CHART.expense} strokeWidth={2.5} fill="url(#ov-expense)" dot={{ r: 3, strokeWidth: 0, fill: CHART.expense }} activeDot={{ r: 5 }} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Section>

        {/* Wallets */}
        <Section title="Wallets" action={<ViewAll to="/wallet" />}>
          <ul className="divide-y divide-gray-100">
            {walletsLoading && [0, 1, 2].map((i) => <li key={i} className="py-3"><Skeleton className="h-9 w-full" /></li>)}
            {activeWallets.map((w) => (
              <li key={w.id}>
                <Link to={`/wallet/${w.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-ink-muted">
                    <WalletIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{w.name}</p>
                    <p className="text-xs capitalize text-ink-muted">{w.type.replace('_', ' ').toLowerCase()}</p>
                  </div>
                  <p className={cn('text-sm font-semibold tabular-nums', !hidden.has('networth') && Number(w.currentBalance) < 0 ? 'text-expense' : 'text-ink')}>
                    {hidden.has('networth') ? MASK : money(Number(w.currentBalance))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* Recent transactions */}
        <Section title="Recent transactions" className="lg:col-span-2" action={<ViewAll to="/transactions" />}>
          {recentLoading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recent?.data.length ? (
            <div className="-mx-3 space-y-0.5">
              {recent.data.map((t) => (
                <TransactionItem key={t.id} transaction={t} currency={currency} onClick={() => setOpenTx(t)} />
              ))}
            </div>
          ) : (
            <EmptyState text="No transactions yet." cta="Add your first transaction" onClick={() => openQuickAdd(true)} />
          )}
        </Section>

        {/* Where money went */}
        <Section title="Top spending this month" action={<ViewAll to="/statistics" />}>
          {topCategories.length ? (
            <ul className="space-y-1.5">
              {topCategories.map((c) => (
                <li key={c.id ?? c.name}>
                  <button
                    onClick={() => setBreakdown(c)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                  >
                  <CategoryIcon name={c.icon} color={c.color} size={15} containerSize={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                      <p className="text-sm font-semibold tabular-nums text-ink">{money(c.amount)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, background: c.color ?? CHART.brand }} />
                    </div>
                  </div>
                  </button>
                </li>
              ))}
              {allCategories.length > 5 && (
                <li>
                  <button
                    onClick={() => setShowAllCats((v) => !v)}
                    className="w-full pt-1 text-center text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    {showAllCats ? 'Show top 5' : `Show all ${allCategories.length} categories`}
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <EmptyState text="No spending this month." />
          )}
        </Section>

        {/* Budgets */}
        <Section title="Budgets" className="lg:col-span-2" action={<ViewAll to="/wallet?tab=budget" />}>
          {budgets?.length ? (
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {budgets.slice(0, 6).map((b) => {
                const pct = Math.round(b.percentage);
                const tone = pct >= 100 ? 'bg-expense' : pct >= 80 ? 'bg-orange-500' : 'bg-income';
                return (
                  <li key={b.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{b.category?.name}</p>
                      <p className="text-xs tabular-nums text-ink-muted">
                        <span className="font-semibold text-ink">{money(b.spent)}</span> / {money(Number(b.amount))}
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className={cn('mt-1 text-xs', pct >= 100 ? 'font-medium text-expense' : 'text-ink-muted')}>
                      {pct >= 100 ? `Over by ${money(b.spent - Number(b.amount))}` : `${money(b.remaining)} left · ${pct}% used`}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState text="Set a monthly budget to keep spending in check." cta="Create a budget" to="/wallet?tab=budget" />
          )}
        </Section>

        {/* Goals */}
        <Section title="Savings goals" action={<ViewAll to="/wallet?tab=goals" />}>
          {goals?.length ? (
            <ul className="space-y-4">
              {goals.slice(0, 3).map((g) => {
                const pct = Math.min(100, Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100) || 0);
                return (
                  <li key={g.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Target size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">{g.name}</p>
                        <p className="text-xs font-semibold tabular-nums text-primary-600">{pct}%</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-ink-muted">
                        {money(Number(g.savedAmount))} of {money(Number(g.targetAmount))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState text="Save towards something that matters." cta="Create a goal" to="/wallet?tab=goals" />
          )}
        </Section>
      </div>

      {openTx && accountId && (
        <TransactionModal accountId={accountId} currency={currency} editing={openTx} onClose={() => setOpenTx(null)} />
      )}
      {remindDebt && (
        <DebtReminderModal debt={remindDebt} currency={currency} onClose={() => setRemindDebt(null)} />
      )}
      {breakdown && (
        <CategoryBreakdownModal
          category={breakdown}
          periodLabel={format(now, 'MMMM yyyy')}
          currency={currency}
          onClose={() => setBreakdown(null)}
          onOpenTransaction={openTransactionById}
        />
      )}
    </div>
  );
}

function EmptyState({ text, cta, to, onClick }: { text: string; cta?: string; to?: string; onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <p className="text-sm text-ink-muted">{text}</p>
      {cta && to && (
        <Link to={to} className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700">{cta}</Link>
      )}
      {cta && onClick && (
        <button onClick={onClick} className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700">{cta}</button>
      )}
    </div>
  );
}
