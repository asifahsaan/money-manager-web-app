import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { debtService } from '@/services/debt.service';
import { dueLabel, dueStatus, urgentDebts } from '@/lib/debt-reminders';
import { cn, formatCurrency } from '@/lib/utils';

// Header bell: debts that are overdue or due within a few days.
export function DueDebtsBell() {
  const accountId = useAccountStore((s) => s.activeAccountId);
  const currency = useAccountStore((s) => s.accounts.find((a) => a.id === s.activeAccountId)?.currency ?? 'Rs.');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', accountId],
    queryFn: () => debtService.getAll(accountId!),
    enabled: !!accountId,
  });
  const urgent = urgentDebts(debts);
  const overdue = urgent.filter((d) => dueStatus(d).kind === 'overdue').length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={urgent.length ? `${urgent.length} debts due soon` : 'No debts due'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <Bell size={18} />
        {urgent.length > 0 && (
          <span
            className={cn(
              'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-surface',
              overdue ? 'bg-red-500' : 'bg-orange-500',
            )}
          >
            {urgent.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-elevated">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Debt reminders</p>
            <p className="text-xs text-ink-muted">Overdue or due in the next few days</p>
          </div>
          {urgent.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Nothing due right now 🎉</p>
          ) : (
            <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
              {urgent.map((d) => {
                const kind = dueStatus(d).kind;
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {d.type === 'RECEIVABLE' ? 'Collect from ' : 'Pay '}
                        {d.personName}
                      </p>
                      <p className={cn('text-xs font-medium', kind === 'overdue' ? 'text-red-600' : 'text-orange-600')}>
                        {dueLabel(d)}
                      </p>
                    </div>
                    <span className={cn('text-sm font-semibold tabular-nums', d.type === 'RECEIVABLE' ? 'text-income' : 'text-expense')}>
                      {formatCurrency(Number(d.remainingAmount), currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            to="/wallet?tab=debt"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-primary-600 hover:bg-gray-50"
          >
            Open debts
          </Link>
        </div>
      )}
    </div>
  );
}
