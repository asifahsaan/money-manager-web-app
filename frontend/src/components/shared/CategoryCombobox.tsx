import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Category, CategoryType } from '@/types';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/pages/transactions/components/CategoryIcon';

interface Props {
  /** Top-level categories with their `children` (as the categories API returns them). */
  categories: Category[];
  value: number | '' | null | undefined;
  onChange: (id: number | '') => void;
  /** Only show this type (income / expense). */
  type?: CategoryType;
  /** Label for the empty choice, e.g. "No category" or "All categories". */
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
  /** Smaller trigger for filter bars. */
  compact?: boolean;
  invalid?: boolean;
}

type Row = { cat: Category; parentName?: string };

/** A select you can type into: filters categories and sub-categories by name. */
export function CategoryCombobox({
  categories, value, onChange, type, emptyLabel = 'No category', placeholder = 'Select category', className, compact, invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // The menu is position:fixed so a scrolling modal can't clip it
  const [pos, setPos] = useState<React.CSSProperties>({});

  const rows: Row[] = useMemo(
    () =>
      categories
        .filter((c) => !c.parentCategoryId && (!type || c.type === type))
        .flatMap((c) => [{ cat: c }, ...(c.children ?? []).map((ch) => ({ cat: ch, parentName: c.name }))]),
    [categories, type],
  );

  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) => r.cat.name.toLowerCase().includes(q) || r.parentName?.toLowerCase().includes(q))
    : rows;
  // index 0 is the empty choice when not searching (none when emptyLabel is '')
  const options: (Row | null)[] = q || !emptyLabel ? shown : [null, ...shown];
  const selected = rows.find((r) => r.cat.id === value);

  useEffect(() => {
    if (!open) return;
    const r = trigger.current!.getBoundingClientRect();
    const menuH = 300;
    const below = window.innerHeight - r.bottom;
    const width = Math.max(r.width, 220);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos(
      below < menuH && r.top > below
        ? { position: 'fixed', left, width, bottom: window.innerHeight - r.top + 4 }
        : { position: 'fixed', left, width, top: r.bottom + 4 },
    );
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    // Scrolling the page/modal would leave the fixed menu behind — just close it
    const onScroll = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    setTimeout(() => input.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function pick(r: Row | null) {
    onChange(r ? r.cat.id : '');
    setOpen(false);
    setQuery('');
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[active] !== undefined) pick(options[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border bg-surface text-left text-sm transition-colors focus:outline-none',
          compact ? 'h-8 px-2 text-xs' : 'h-10 px-3',
          open ? 'border-primary-500 ring-2 ring-primary-100' : invalid ? 'border-expense' : 'border-line hover:border-gray-300',
        )}
      >
        {selected && <CategoryIcon name={selected.cat.icon} color={selected.cat.color} size={compact ? 11 : 13} containerSize={compact ? 18 : 22} />}
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-ink' : 'text-ink-muted')}>
          {selected ? (selected.parentName ? `${selected.parentName} › ${selected.cat.name}` : selected.cat.name) : value === '' || value == null ? emptyLabel || placeholder : placeholder}
        </span>
        {selected && emptyLabel ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear category"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="rounded p-0.5 text-ink-muted hover:bg-gray-100 hover:text-ink"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={15} className="shrink-0 text-ink-muted" />
        )}
      </button>

      {open && (
        <div style={pos} className="z-[70] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={14} className="shrink-0 text-ink-muted" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search categories…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <ul ref={list} className="max-h-60 overflow-y-auto py-1" role="listbox">
            {options.length === 0 && <li className="px-3 py-3 text-center text-xs text-ink-muted">No category matches "{query}"</li>}
            {options.map((r, i) => {
              const isSel = r ? r.cat.id === value : value === '' || value == null;
              return (
                <li
                  key={r ? r.cat.id : 'none'}
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm',
                    i === active && 'bg-primary-50',
                    r?.parentName && !q && 'pl-8',
                  )}
                >
                  {r ? (
                    <>
                      <CategoryIcon name={r.cat.icon} color={r.cat.color} size={12} containerSize={22} />
                      <span className="min-w-0 flex-1 truncate text-ink">
                        {q && r.parentName ? <span className="text-ink-muted">{r.parentName} › </span> : null}
                        {r.cat.name}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-ink-muted">{emptyLabel || 'None'}</span>
                  )}
                  {isSel && <Check size={14} className="shrink-0 text-primary-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
