import { useEffect, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, CornerDownLeft, History } from 'lucide-react';
import { insightsService, type EntrySuggestion } from '@/services/insights.service';
import { parseQuickAdd, type QuickAddResult } from '@/lib/quick-add';
import { cn, formatCurrency } from '@/lib/utils';
import type { TransactionType, Wallet } from '@/types';
import { CategoryIcon } from '../CategoryIcon';

/** What a smart fill wants to put in the form. */
export interface SmartFill {
  type?: TransactionType;
  amount?: number;
  description?: string;
  categoryId?: number | null;
  walletId?: number;
  toWalletId?: number;
  date?: string;
  time?: string;
}

/** Best past entry for a note: same type, exact note first, else starts-with. */
export function pickSuggestion(list: EntrySuggestion[], note: string, type?: TransactionType): EntrySuggestion | undefined {
  const n = note.trim().toLowerCase();
  const ok = list.filter((s) => !type || type === 'TRANSFER' || s.type === type);
  return ok.find((s) => s.description.toLowerCase() === n) ?? ok.find((s) => s.description.toLowerCase().startsWith(n)) ?? ok[0];
}

function dateChip(ymd: string): string {
  const today = new Date();
  const local = (d: Date) => format(d, 'yyyy-MM-dd');
  if (ymd === local(today)) return 'Today';
  if (ymd === local(subDays(today, 1))) return 'Yesterday';
  return format(parseISO(ymd), 'd MMM');
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * One line → a filled form: "300 rider cash", "salary 180k meezan",
 * "2000 meezan to jazzcash", "dinner 2.3k yesterday 9pm".
 */
export function QuickAddBar({ accountId, wallets, currency, onFill }: {
  accountId: number;
  wallets: Wallet[];
  currency: string;
  onFill: (fill: SmartFill) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed: QuickAddResult | null = text.trim() ? parseQuickAdd(text, wallets) : null;

  async function apply() {
    if (!parsed) return;
    setBusy(true);
    const fill: SmartFill = {
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description || undefined,
      walletId: parsed.walletId,
      toWalletId: parsed.toWalletId,
      date: parsed.date,
      time: parsed.time,
    };
    // Learn the category (and wallet, if not named) from past entries with this note
    if (parsed.description && parsed.type !== 'TRANSFER') {
      try {
        const list = await insightsService.suggestions(accountId, parsed.description, parsed.type);
        const s = pickSuggestion(list, parsed.description, parsed.type);
        if (s) {
          fill.type = fill.type ?? s.type;
          fill.categoryId = s.categoryId;
          fill.walletId = fill.walletId ?? s.walletId ?? undefined;
          // use the note as it was written before, e.g. "UOL to Office"
          if (s.description.toLowerCase().startsWith(parsed.description.toLowerCase())) fill.description = s.description;
        }
      } catch {
        /* fill without a category */
      }
    }
    onFill(fill);
    setText('');
    setBusy(false);
  }

  const walletName = (id?: number) => wallets.find((w) => w.id === id)?.name;
  const chips = parsed
    ? [
        parsed.amount ? formatCurrency(parsed.amount, currency) : null,
        parsed.type === 'INCOME' ? 'Income' : parsed.type === 'TRANSFER' ? 'Transfer' : null,
        parsed.toWalletId ? `${walletName(parsed.walletId)} → ${walletName(parsed.toWalletId)}` : walletName(parsed.walletId),
        parsed.date ? dateChip(parsed.date) : null,
        parsed.time ?? null,
        parsed.description ? `“${parsed.description}”` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="shrink-0 text-primary-600" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }}
          placeholder='Quick add: "300 rider cash" · "salary 180k meezan"'
          aria-label="Quick add"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        {parsed && (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Fill <CornerDownLeft size={12} />
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={String(c)} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-line">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Past entries matching what's typed in the note; picking one fills category, wallet and amount. */
export function NoteSuggestions({ accountId, note, type, currency, visible, onPick }: {
  accountId: number;
  note: string;
  type: TransactionType;
  currency: string;
  visible: boolean;
  onPick: (s: EntrySuggestion) => void;
}) {
  const q = useDebounced(note.trim(), 250);
  const { data = [] } = useQuery({
    queryKey: ['entry-suggestions', accountId, q, type],
    queryFn: () => insightsService.suggestions(accountId, q, type === 'TRANSFER' ? undefined : type),
    enabled: visible && q.length >= 2 && type !== 'TRANSFER',
    staleTime: 60_000,
  });
  // nothing to suggest if the note already is exactly a past note
  const list = data.filter((s) => s.description.toLowerCase() !== note.trim().toLowerCase() || s.categoryId);
  if (!visible || q.length < 2 || !list.length) return null;

  return (
    // opens upwards: the note is the last field, so a menu below it would be cut off by the form's scroll area
    <ul className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
      <li className="flex items-center gap-1 px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        <History size={11} /> From your past entries
      </li>
      {list.slice(0, 4).map((s) => (
        <li key={`${s.description}-${s.categoryId}-${s.walletId}`}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onPick(s); }}
            className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-primary-50')}
          >
            <CategoryIcon name={s.categoryIcon} color={s.categoryColor} size={12} containerSize={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{s.description}</span>
              <span className="block truncate text-[11px] text-ink-muted">
                {[s.categoryLabel, s.walletName, `${s.count}×`].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted">{formatCurrency(s.amount, currency)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
