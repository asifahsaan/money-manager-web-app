import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Plus, Target, Wallet as WalletIcon } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { useAuthStore } from '@/stores/auth.store';
import { useQuickAddStore } from '@/stores/quick-add.store';
import { walletService } from '@/services/wallet.service';
import { statisticsService } from '@/services/statistics.service';
import { transactionService } from '@/services/transaction.service';
import { budgetService } from '@/services/budget.service';
import { goalService } from '@/services/goal.service';
import { TransactionItem } from '@/pages/transactions/components/TransactionItem';
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
  if (!previous) return <span className="text-xs text-ink-muted">No data last month</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={cn('flex items-center font-semibold', good ? 'text-income' : 'text-expense')}>
        <Icon size={14} />
        {Math.abs(pct).toFixed(0)}%
      </span>
      <span className="text-ink-muted">vs last month</span>
    </span>
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
  const topCategories = (month?.expenseBreakdown ?? []).slice(0, 5);

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 p-5 text-white shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <WalletIcon size={16} /> Net worth
          </div>
          {walletsLoading ? (
            <div className="mt-3 h-8 w-40 animate-pulse rounded-md bg-white/20" />
          ) : (
            <p className="mt-2 text-[26px] font-bold leading-tight tracking-tight tabular-nums lg:text-[22px] xl:text-[28px]">{money(netWorth)}</p>
          )}
          <p className="mt-1 text-xs text-white/75">
            Across {activeWallets.filter((w) => w.includedInTotal).length} wallets
          </p>
        </div>

        <div className="stat-card">
          <p className="text-sm font-medium text-ink-muted">Income</p>
          {monthLoading ? <Skeleton className="mt-3 h-7 w-28" /> : (
            <p className="mt-1.5 text-xl font-bold tracking-tight text-income lg:text-lg xl:text-2xl">{money(income)}</p>
          )}
          <div className="mt-1.5"><Delta current={income} previous={lastMonth?.totalIncome ?? 0} goodWhenUp /></div>
        </div>

        <div className="stat-card">
          <p className="text-sm font-medium text-ink-muted">Expenses</p>
          {monthLoading ? <Skeleton className="mt-3 h-7 w-28" /> : (
            <p className="mt-1.5 text-xl font-bold tracking-tight text-expense lg:text-lg xl:text-2xl">{money(expense)}</p>
          )}
          <div className="mt-1.5"><Delta current={expense} previous={lastMonth?.totalExpense ?? 0} goodWhenUp={false} /></div>
        </div>

        <div className="stat-card col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-ink-muted">Saved this month</p>
          {monthLoading ? <Skeleton className="mt-3 h-7 w-28" /> : (
            <p className={cn('mt-1.5 text-xl font-bold tracking-tight lg:text-lg xl:text-2xl', saved >= 0 ? 'text-ink' : 'text-expense')}>
              {money(saved)}
            </p>
          )}
          {savingsRate !== null && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn('h-full rounded-full', savingsRate >= 0 ? 'bg-income' : 'bg-expense')}
                  style={{ width: `${Math.min(100, Math.abs(savingsRate))}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">{savingsRate}% of income saved</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Cash flow */}
        <Section
          title="Cash flow"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART.income }} />Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART.expense }} />Expense</span>
            </div>
          }
        >
          <div className="h-64">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
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
                  <p className={cn('text-sm font-semibold tabular-nums', Number(w.currentBalance) < 0 ? 'text-expense' : 'text-ink')}>
                    {money(Number(w.currentBalance))}
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
                <TransactionItem key={t.id} transaction={t} currency={currency} onClick={() => undefined} />
              ))}
            </div>
          ) : (
            <EmptyState text="No transactions yet." cta="Add your first transaction" onClick={() => openQuickAdd(true)} />
          )}
        </Section>

        {/* Where money went */}
        <Section title="Top spending this month" action={<ViewAll to="/statistics" />}>
          {topCategories.length ? (
            <ul className="space-y-3.5">
              {topCategories.map((c) => (
                <li key={c.id ?? c.name} className="flex items-center gap-3">
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
                </li>
              ))}
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
