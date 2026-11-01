import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, Loader2, X } from 'lucide-react';
import type { Debt, Wallet } from '@/types';
import { debtService } from '@/services/debt.service';
import { invalidateMoneyQueries } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api-error';
import { cn, formatCurrency } from '@/lib/utils';

type Direction = 'RECEIVABLE' | 'PAYABLE';

/** Split an amount over loans oldest first, each up to what's left on it. */
export function allocate(loans: Debt[], amount: number): { debt: Debt; amount: number }[] {
  const out: { debt: Debt; amount: number }[] = [];
  let left = Math.round(amount * 100) / 100;
  for (const d of [...loans].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
    if (left <= 0) break;
    const take = Math.min(left, Number(d.remainingAmount));
    if (take > 0) out.push({ debt: d, amount: take });
    left = Math.round((left - take) * 100) / 100;
  }
  return out;
}

/**
 * One payment from/to a person, spread over their open loans oldest first —
 * so "Ammar sent 150,000" is one entry here instead of choosing a loan.
 */
export function PersonPaymentModal({ personName, loans, wallets, currency, onClose }: {
  personName: string;
  /** This person's open loans */
  loans: Debt[];
  wallets: Wallet[];
  currency: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const owedToMe = loans.filter((d) => d.type === 'RECEIVABLE');
  const iOwe = loans.filter((d) => d.type === 'PAYABLE');
  const sum = (ls: Debt[]) => ls.reduce((t, d) => t + Number(d.remainingAmount), 0);
  const [direction, setDirection] = useState<Direction>(sum(owedToMe) >= sum(iOwe) && owedToMe.length ? 'RECEIVABLE' : 'PAYABLE');
  const pool = direction === 'RECEIVABLE' ? owedToMe : iOwe;
  const max = sum(pool);

  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState<number | ''>(pool[0]?.walletId ?? wallets.find((w) => !w.archived)?.id ?? '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const value = Number(amount);
  const plan = useMemo(() => (value > 0 ? allocate(pool, value) : []), [pool, value]);
  const tooMuch = value > max + 0.001;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  async function save() {
    if (!(value > 0) || tooMuch || !walletId) return;
    setSaving(true);
    let done = 0;
    try {
      for (const p of plan) {
        await debtService.pay(p.debt.id, { amount: p.amount, walletId: Number(walletId), date, note: note.trim() || undefined });
        done++;
      }
      toast.success(`${direction === 'RECEIVABLE' ? 'Collected' : 'Paid'} ${formatCurrency(value, currency)} · ${plan.length} loan${plan.length === 1 ? '' : 's'} updated`);
      onClose();
    } catch (err) {
      toast.error(
        done
          ? `Saved on ${done} of ${plan.length} loans, then failed: ${apiErrorMessage(err, 'error')}. Check the loans before retrying.`
          : apiErrorMessage(err, 'Could not save the payment'),
        { duration: 8000 },
      );
    } finally {
      void invalidateMoneyQueries(qc);
      setSaving(false);
    }
  }

  const input = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-ink-muted';
  const name = personName.trim();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Record a payment" className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-ink">Record a payment — {name}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Applied to the oldest loan first, then the next.</p>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="Close" className="rounded-full p-1 hover:bg-gray-100"><X size={18} className="text-ink-muted" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {owedToMe.length > 0 && iOwe.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
              {([['RECEIVABLE', `${name} paid me`, ArrowDownLeft], ['PAYABLE', `I paid ${name}`, ArrowUpRight]] as const).map(([d, text, Icon]) => (
                <button key={d} type="button" onClick={() => setDirection(d)}
                  className={cn('flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-semibold', direction === d ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}>
                  <Icon size={13} /> {text}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Amount</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={cn(input, tooMuch && 'border-expense')} />
            </div>
            <div>
              <label className={label}>{direction === 'RECEIVABLE' ? 'Received in' : 'Paid from'}</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : '')} className={input}>
                <option value="">Select wallet</option>
                {wallets.filter((w) => !w.archived).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(input, 'px-2')} />
            </div>
            <div>
              <label className={label}>Note <span className="font-normal">(optional)</span></label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer" className={input} />
            </div>
          </div>

          <div className="rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs">
              <span className="font-semibold text-ink">How it's applied</span>
              <button type="button" onClick={() => setAmount(String(max))} className="font-medium text-primary-600 hover:underline">
                Settle all ({formatCurrency(max, currency)})
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {[...pool].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id).map((d) => {
                const part = plan.find((p) => p.debt.id === d.id)?.amount ?? 0;
                const after = Number(d.remainingAmount) - part;
                return (
                  <li key={d.id} className={cn('flex items-center gap-2 px-3 py-2 text-xs', part > 0 ? 'bg-primary-50/40' : '')}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{format(parseISO(d.date.slice(0, 10)), 'd MMM yyyy')}{d.description ? ` · ${d.description}` : ''}</span>
                      <span className="block text-ink-muted">{formatCurrency(Number(d.remainingAmount), currency)} left</span>
                    </span>
                    <span className="text-right tabular-nums">
                      {part > 0 ? (
                        <>
                          <span className="block font-semibold text-income">− {formatCurrency(part, currency)}</span>
                          <span className="block text-ink-muted">{after <= 0 ? 'Settled ✓' : `${formatCurrency(after, currency)} left`}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {tooMuch && <p className="text-xs font-medium text-expense">That's more than the {formatCurrency(max, currency)} outstanding.</p>}
        </div>

        <div className="border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !(value > 0) || tooMuch || !walletId}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'rgb(var(--c-brand-600))' }}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {value > 0 && !tooMuch ? `Save · ${plan.length} loan${plan.length === 1 ? '' : 's'}` : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
