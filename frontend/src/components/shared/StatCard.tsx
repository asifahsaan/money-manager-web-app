import type { ReactNode } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASK } from '@/lib/use-privacy';

type Tone = 'neutral' | 'income' | 'expense' | 'brand' | 'warning';

const TONE: Record<Tone, { text: string; chip: string }> = {
  neutral: { text: 'text-ink', chip: 'bg-gray-100 text-ink-muted' },
  income: { text: 'text-income', chip: 'bg-income-light text-income' },
  expense: { text: 'text-expense', chip: 'bg-expense-light text-expense' },
  brand: { text: 'text-primary-700', chip: 'bg-primary-50 text-primary-600' },
  warning: { text: 'text-orange-600', chip: 'bg-orange-50 text-orange-600' },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  /** Amount is masked; shows the eye toggle when onToggleHidden is given. */
  hidden?: boolean;
  onToggleHidden?: () => void;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/** Compact KPI tile — same height everywhere, value never wraps. */
export function StatCard({
  label, value, sub, tone = 'neutral', icon: Icon, hidden, onToggleHidden, loading, onClick, active, className,
}: StatCardProps) {
  const t = TONE[tone];
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick && { onClick, type: 'button' as const })}
      className={cn(
        'flex h-[84px] min-w-0 items-center gap-3 rounded-2xl border bg-surface px-3.5 text-left shadow-sm transition-colors',
        active ? 'border-primary-300 ring-1 ring-primary-200' : 'border-line',
        onClick && 'hover:border-primary-200',
        className,
      )}
    >
      {Icon && (
        <span className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', t.chip)}>
          <Icon size={17} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-ink-muted">{label}</p>
        <p className={cn('truncate text-lg font-black leading-tight tabular-nums', t.text)}>
          {loading ? <span className="skeleton inline-block h-5 w-24 align-middle" /> : hidden ? MASK : value}
        </p>
        {sub && <p className="truncate text-[10.5px] text-ink-muted">{sub}</p>}
      </div>
      {onToggleHidden && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleHidden(); } }}
          title={hidden ? `Show ${label}` : `Hide ${label}`}
          aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
          className="-mr-1 self-start rounded-lg p-1.5 text-ink-muted/70 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </span>
      )}
    </Wrapper>
  );
}

/** "Hide all / Show all" link that sits above a row of StatCards. */
export function HideAllButton({ allHidden, onClick }: { allHidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
    >
      {allHidden ? <EyeOff size={13} /> : <Eye size={13} />}
      {allHidden ? 'Show all' : 'Hide all'}
    </button>
  );
}

/** Title row for a tab/section: name, optional summary text, actions on the right. */
export function SectionBar({ title, meta, children }: { title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {meta && <p className="text-xs text-ink-muted">{meta}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

/** The primary "+ Add …" button used by each tab. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold shadow-sm transition-all active:scale-95"
      style={{ background: 'rgb(var(--c-brand-600))', color: '#ffffff' }}
    >
      <span className="text-base leading-none">+</span> {label}
    </button>
  );
}
