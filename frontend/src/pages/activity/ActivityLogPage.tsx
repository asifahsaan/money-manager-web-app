import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ChevronDown, History, Loader2, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { auditService, type AuditAction, type AuditChange, type AuditEntry, type AuditPage, type AuditRow } from '@/services/audit.service';
import { Pager } from '@/pages/wallet/components/DebtActivityLog';
import { cn, formatCurrency } from '@/lib/utils';

type Names = AuditPage['names'];

const ENTITY_LABEL: Record<string, string> = {
  Transaction: 'Transaction',
  Wallet: 'Wallet',
  Category: 'Category',
  Budget: 'Budget',
  Goal: 'Goal',
  GoalEntry: 'Goal money',
  Debt: 'Debt',
  DebtEntry: 'Debt payment',
  Recurring: 'Recurring',
};
const FILTERS: [string, string][] = [
  ['', 'Everything'],
  ['Transaction', 'Transactions'],
  ['Debt', 'Debts'],
  ['DebtEntry', 'Debt payments'],
  ['Wallet', 'Wallets'],
  ['Budget', 'Budgets'],
  ['Goal', 'Goals'],
  ['Recurring', 'Recurring'],
  ['Category', 'Categories'],
];
const ACTION: Record<AuditAction, { verb: string; icon: LucideIcon; tone: string }> = {
  created: { verb: 'Added', icon: Plus, tone: 'bg-income-light text-income' },
  updated: { verb: 'Edited', icon: Pencil, tone: 'bg-amber-50 text-amber-600' },
  deleted: { verb: 'Deleted', icon: Trash2, tone: 'bg-expense-light text-expense' },
};

const FIELD_LABEL: Record<string, string> = {
  amount: 'Amount', totalAmount: 'Amount', targetAmount: 'Target', savedAmount: 'Saved', remainingAmount: 'Remaining',
  settledAmount: 'Paid back', initialBalance: 'Opening balance', currentBalance: 'Balance', feeAmount: 'Fee',
  date: 'Date', time: 'Time', dueDate: 'Due date', goalDate: 'Target date', startDate: 'Starts', endDate: 'Ends', nextOccurrence: 'Next',
  description: 'Description', memo: 'Memo', note: 'Note', name: 'Name', personName: 'Person', type: 'Type', transactionType: 'Type',
  categoryId: 'Category', walletId: 'Wallet', fromWalletId: 'From', toWalletId: 'To', parentCategoryId: 'Parent',
  status: 'Status', isActive: 'On', archived: 'Archived', includedInTotal: 'In total', frequency: 'Repeats', weekdays: 'Days',
  activeWeekdays: 'Days', periodType: 'Period', contactPhone: 'Phone', contactEmail: 'Email', icon: 'Icon', color: 'Colour',
};
const MONEY = new Set(['amount', 'totalAmount', 'targetAmount', 'savedAmount', 'remainingAmount', 'settledAmount', 'initialBalance', 'currentBalance', 'feeAmount']);
const DATES = new Set(['date', 'dueDate', 'goalDate', 'startDate', 'endDate', 'nextOccurrence']);
// Shown for an added or deleted record, in this order, when present
const KEY_FIELDS = ['type', 'transactionType', 'amount', 'totalAmount', 'targetAmount', 'initialBalance', 'date', 'time', 'personName', 'name', 'description', 'note', 'categoryId', 'walletId', 'fromWalletId', 'toWalletId', 'dueDate'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function value(field: string, v: unknown, names: Names, currency: string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (MONEY.has(field)) return formatCurrency(Number(v), currency);
  if (DATES.has(field) && typeof v === 'string') return format(parseISO(v.slice(0, 10)), 'd MMM yyyy');
  if (field === 'categoryId' || field === 'parentCategoryId') return names.categories[String(v)] ?? `#${v}`;
  if (field === 'walletId' || field === 'fromWalletId' || field === 'toWalletId') return names.wallets[String(v)] ?? `#${v}`;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return (field === 'weekdays' || field === 'activeWeekdays') ? (v.length ? v.map((d) => DAYS[Number(d)] ?? d).join(', ') : 'Every day') : v.join(', ');
  return prettyEnum(String(v));
}
const prettyEnum = (s: string) => (/^[A-Z_]+$/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : s);

/** One line naming the record, e.g. "Expense Rs. 900 · Cashew · Cash". */
function describe(c: AuditChange, names: Names, currency: string): string {
  const r = (c.after ?? c.before ?? {}) as AuditRow;
  const money = (v: unknown) => formatCurrency(Number(v ?? 0), currency);
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const parts = (...xs: string[]) => xs.filter(Boolean).join(' · ');
  switch (c.entity) {
    case 'Transaction': {
      const kind = r.isOpeningBalance ? 'Opening balance' : prettyEnum(String(r.type));
      const where = r.type === 'TRANSFER'
        ? `${names.wallets[String(r.fromWalletId)] ?? '?'} → ${names.wallets[String(r.toWalletId)] ?? '?'}`
        : names.wallets[String(r.walletId)] ?? '';
      return parts(`${kind} ${money(r.amount)}`, text(r.description), names.categories[String(r.categoryId)] ?? '', where, r.date ? value('date', r.date, names, currency) : '');
    }
    case 'DebtEntry':
      return parts(`${r.type === 'COLLECTION' ? 'Payment received' : 'Payment made'} ${money(r.amount)}`, names.debts[String(r.debtId)] ?? '', text(r.note), r.date ? value('date', r.date, names, currency) : '');
    case 'Debt':
      return parts(`${r.type === 'RECEIVABLE' ? 'Lent to' : 'Borrowed from'} ${text(r.personName)} ${money(r.totalAmount)}`, text(r.description));
    case 'Wallet':
      return `${text(r.name)}${c.sideEffect ? ' balance' : ''}`;
    case 'Category':
      return text(r.name);
    case 'Budget':
      return parts(`${names.categories[String(r.categoryId)] ?? 'Budget'} ${money(r.amount)}`, prettyEnum(String(r.periodType ?? '')));
    case 'Goal':
      return parts(text(r.name), `target ${money(r.targetAmount)}`);
    case 'GoalEntry':
      return parts(`${r.type === 'WITHDRAW' ? 'Taken out' : 'Added'} ${money(r.amount)}`, names.goals[String(r.goalId)] ?? '');
    case 'Recurring':
      return parts(`${prettyEnum(String(r.transactionType))} ${money(r.amount)}`, text(r.description), prettyEnum(String(r.frequency ?? '')));
    default:
      return '';
  }
}

function ChangeDetail({ c, names, currency }: { c: AuditChange; names: Names; currency: string }) {
  if (c.action === 'updated' && c.before && c.after) {
    return (
      <ul className="mt-1 space-y-0.5">
        {c.changed.map((f) => (
          <li key={f} className="text-xs text-ink-muted">
            <span className="font-medium text-ink">{FIELD_LABEL[f] ?? f}:</span>{' '}
            <span className="line-through decoration-expense/50">{value(f, c.before![f], names, currency)}</span>
            {' → '}
            <span className="font-medium text-ink">{value(f, c.after![f], names, currency)}</span>
          </li>
        ))}
      </ul>
    );
  }
  const row = (c.after ?? c.before ?? {}) as AuditRow;
  const shown = KEY_FIELDS.filter((f) => row[f] !== undefined && row[f] !== null && row[f] !== '');
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
      {shown.map((f) => (
        <span key={f}><span className="font-medium text-ink">{FIELD_LABEL[f] ?? f}:</span> {value(f, row[f], names, currency)}</span>
      ))}
    </div>
  );
}

/** The record type the request was about, from its address (e.g. /api/debts/7/pay → a debt payment). */
function leadEntity(path: string): string | undefined {
  const [, resource] = path.replace(/^\/api/, '').split('/');
  if (resource === 'transactions') return 'Transaction';
  if (resource === 'debts') return /\/(pay|entries)/.test(path) ? 'DebtEntry' : 'Debt';
  if (resource === 'goals') return /\/(deposit|withdraw|entries)/.test(path) ? 'GoalEntry' : 'Goal';
  if (resource === 'recurrings') return path.includes('process-due') || path.includes('execute') ? 'Transaction' : 'Recurring';
  return { wallets: 'Wallet', budgets: 'Budget', categories: 'Category' }[resource ?? ''];
}

function EntryCard({ e, names, currency }: { e: AuditEntry; names: Names; currency: string }) {
  const [open, setOpen] = useState(false);
  const main = e.changes.filter((c) => !c.sideEffect);
  const side = e.changes.filter((c) => c.sideEffect);
  // Lead with what the user acted on: deleting a transaction also deletes its debt payment
  const target = leadEntity(e.path);
  const lead = main.find((c) => c.entity === target) ?? main[0] ?? e.changes[0];
  const { verb, icon: Icon, tone } = ACTION[lead.action];
  const auto = e.path.includes('process-due');

  return (
    <li className="px-4 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left" aria-expanded={open}>
        <span className={cn('mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', tone)}><Icon size={15} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            {verb} {ENTITY_LABEL[lead.entity]?.toLowerCase() ?? lead.entity}
            {main.length > 1 && <span className="font-normal text-ink-muted"> + {main.length - 1} more</span>}
          </span>
          <span className="block truncate text-xs text-ink-muted">{describe(lead, names, currency)}</span>
        </span>
        <span className="flex flex-shrink-0 flex-col items-end gap-0.5">
          <span className="text-xs tabular-nums text-ink-muted">{format(parseISO(e.at), 'h:mm a')}</span>
          {auto && <span className="rounded-full bg-primary-50 px-1.5 text-[10px] font-medium text-primary-700">Automatic</span>}
        </span>
        <ChevronDown size={15} className={cn('mt-1.5 flex-shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 border-line pl-3">
          {main.map((c) => (
            <div key={c.id}>
              <p className="text-xs font-semibold text-ink">
                {ACTION[c.action].verb} {ENTITY_LABEL[c.entity]?.toLowerCase() ?? c.entity}
                <span className="font-normal text-ink-muted"> · {describe(c, names, currency)}</span>
              </p>
              <ChangeDetail c={c} names={names} currency={currency} />
            </div>
          ))}
          {side.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Also updated</p>
              {side.map((c) => (
                <div key={c.id} className="text-xs text-ink-muted">
                  <span className="font-medium text-ink">{describe(c, names, currency)}</span>
                  {c.changed.map((f) => (
                    <span key={f}> · {FIELD_LABEL[f] ?? f} {value(f, c.before?.[f], names, currency)} → {value(f, c.after?.[f], names, currency)}</span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-muted">{format(parseISO(e.at), "EEEE, d MMM yyyy 'at' h:mm:ss a")}</p>
        </div>
      )}
    </li>
  );
}

const dayLabel = (iso: string) => {
  const d = parseISO(iso);
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM yyyy');
};

/** Every change on the account — what was added, edited or deleted, and when. */
export function ActivityLogPage() {
  const accountId = useAccountStore((s) => s.activeAccountId);
  const currency = useAccountStore((s) => s.accounts.find((a) => a.id === s.activeAccountId)?.currency ?? 'Rs.');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', accountId, entity, action, page],
    queryFn: () => auditService.list({ accountId: accountId!, page, limit: 25, entity: entity || undefined, action: action || undefined }),
    enabled: !!accountId,
    placeholderData: (prev) => prev,
  });

  if (!accountId) return null;

  const days: [string, AuditEntry[]][] = [];
  for (const e of data?.entries ?? []) {
    const label = dayLabel(e.at);
    const last = days[days.length - 1];
    if (last && last[0] === label) last[1].push(e);
    else days.push([label, [e]]);
  }
  const select = 'h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink focus:border-primary-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><History size={18} className="text-primary-600" /> Activity log</h2>
          <p className="text-sm text-ink-muted">Every add, edit and delete, with the time and what it was before.</p>
        </div>
        <div className="flex gap-2">
          <select aria-label="What changed" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className={select}>
            {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select aria-label="Kind of change" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={select}>
            <option value="">All changes</option>
            <option value="created">Added</option>
            <option value="updated">Edited</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-ink-muted"><Loader2 size={16} className="mr-2 animate-spin" /> Loading the log…</div>
      ) : !data?.entries.length ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          {entity || action ? 'Nothing matches these filters.' : 'No changes recorded yet. From now on every add, edit and delete shows up here.'}
        </div>
      ) : (
        <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
          {days.map(([label, entries]) => (
            <section key={label}>
              <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</h3>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-line bg-surface">
                {entries.map((e) => <EntryCard key={e.requestId} e={e} names={data.names} currency={currency} />)}
              </ul>
            </section>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">{data.total} change{data.total === 1 ? '' : 's'}</span>
            <Pager page={data.page} pages={data.pages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
