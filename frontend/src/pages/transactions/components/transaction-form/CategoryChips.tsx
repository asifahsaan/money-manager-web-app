import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, CategoryType } from '@/types';
import { CategoryIcon } from '../CategoryIcon';
import { CategoryPicker } from './CategoryPicker';
import { categoryUsage } from './preferences';

const CHIP_COUNT = 7;

interface Props {
  categories: Category[];
  value: number | undefined;
  onChange: (id: number) => void;
  accountId: number;
  type: CategoryType;
  onCreated: () => void;
}

// One-tap categories: the most used ones (per this browser) as chips, the full
// searchable list — including subcategories and "create" — behind "More".
export function CategoryChips({ categories, value, onChange, accountId, type, onCreated }: Props) {
  const [showAll, setShowAll] = useState(false);

  const flat = useMemo(() => categories.flatMap((c) => [c, ...(c.children ?? [])]), [categories]);
  // Ranking is computed once per category list so chips don't jump while typing
  const ranked = useMemo(() => {
    const usage = categoryUsage(accountId);
    return [...flat]
      .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0))
      // Unused subcategories stay behind "More"; unused top-level ones keep their order
      .filter((c) => (usage[c.id] ?? 0) > 0 || !c.parentCategoryId)
      .slice(0, CHIP_COUNT);
  }, [flat, accountId]);

  // A category picked from "More" (or loaded for editing) takes the last chip slot
  const selected = flat.find((c) => c.id === value);
  const chips =
    selected && !ranked.some((c) => c.id === selected.id) ? [...ranked.slice(0, CHIP_COUNT - 1), selected] : ranked;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={active}
              className={cn(
                'flex h-9 max-w-[11rem] items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
                active
                  ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700'
                  : 'border-line bg-surface text-ink hover:border-gray-300 hover:bg-gray-50',
              )}
              title={c.name}
            >
              <CategoryIcon name={c.icon} color={c.color} size={13} containerSize={26} />
              <span className="truncate">{c.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className={cn(
            'flex h-9 items-center gap-1 rounded-full border border-dashed px-3 text-sm font-medium transition-colors',
            showAll ? 'border-primary-500 text-primary-700' : 'border-gray-300 text-ink-muted hover:text-ink',
          )}
        >
          More <ChevronDown size={14} className={cn('transition-transform', showAll && 'rotate-180')} />
        </button>
      </div>

      {showAll && (
        <CategoryPicker
          embedded
          categories={categories}
          value={value}
          onChange={onChange}
          accountId={accountId}
          type={type}
          onCreated={onCreated}
          onDismiss={() => setShowAll(false)}
        />
      )}
    </div>
  );
}
