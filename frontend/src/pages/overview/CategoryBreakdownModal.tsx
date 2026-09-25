import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronRight, X } from 'lucide-react';
import type { CategoryBreakdownItem } from '@/services/statistics.service';
import { CategoryIcon } from '@/pages/transactions/components/CategoryIcon';
import { formatCurrency } from '@/lib/utils';

interface Props {
  category: CategoryBreakdownItem;
  periodLabel: string;
  currency: string;
  onClose: () => void;
  onOpenTransaction: (id: number) => void;
}

const pct = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// Where the money in one category went: subcategory split + every transaction.
export function CategoryBreakdownModal({ category, periodLabel, currency, onClose, onOpenTransaction }: Props) {
  const color = category.color ?? '#6366f1';
  const money = (n: number) => formatCurrency(n, currency);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${category.name} breakdown`}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-surface-raised shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <CategoryIcon name={category.icon} color={category.color} size={20} containerSize={44} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">{periodLabel}</p>
            <h2 className="truncate text-lg font-semibold text-ink">{category.name}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              <span className="font-semibold tabular-nums text-expense">{money(category.amount)}</span>
              {' · '}
              {pct(category.percentage)}% of spending · {category.transactions.length} transaction
              {category.transactions.length === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100" aria-label="Close">
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* Subcategories */}
          {category.subCategories.length > 0 && (
            <section className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Breakdown</h3>
              <ul className="space-y-3">
                {category.subCategories.map((s) => (
                  <li key={s.id ?? s.name}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">{s.name}</span>
                      <span className="flex-shrink-0 tabular-nums text-ink">
                        <span className="font-semibold">{money(s.amount)}</span>
                        <span className="ml-1.5 text-xs text-ink-muted">{pct(s.percentage)}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${s.percentage}%`, background: s.color ?? color }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Transactions */}
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Transactions</h3>
            <ul className="-mx-2">
              {category.transactions.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onOpenTransaction(t.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="w-11 flex-shrink-0 text-center">
                      <p className="text-[11px] uppercase text-ink-muted">{format(parseISO(t.date), 'MMM')}</p>
                      <p className="text-base font-semibold leading-tight text-ink">{format(parseISO(t.date), 'd')}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {t.description?.trim() || t.subcategoryName || category.name}
                      </p>
                      {t.subcategoryName && <p className="truncate text-xs text-ink-muted">{t.subcategoryName}</p>}
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-expense">-{money(t.amount)}</span>
                    <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-line px-5 py-3">
          <Link
            to="/statistics"
            onClick={onClose}
            className="flex items-center justify-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Open full statistics <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
