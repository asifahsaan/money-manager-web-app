import { cn } from '@/lib/utils';

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Monday-first, as the week runs in Pakistan
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Every day" / "Mon–Fri" / "Weekends" / "Mon, Tue, Fri" (0 = Sunday … 6 = Saturday; empty = every day). */
export function weekdaysLabel(days: number[] | null | undefined): string {
  const d = [...new Set(days ?? [])].sort((a, b) => a - b);
  if (d.length === 0 || d.length === 7) return 'Every day';
  if (d.join() === '1,2,3,4,5') return 'Mon–Fri';
  if (d.join() === '1,2,3,4,5,6') return 'Mon–Sat';
  if (d.join() === '0,6') return 'Weekends';
  return WEEKDAY_ORDER.filter((x) => d.includes(x)).map((x) => WEEKDAY_SHORT[x]).join(', ');
}

/** Seven toggle chips plus quick presets. */
export function WeekdayPicker({ value, onChange, presets = true }: { value: number[]; onChange: (days: number[]) => void; presets?: boolean }) {
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={value.includes(d)}
            className={cn(
              'h-8 rounded-lg border text-xs font-semibold transition-colors',
              value.includes(d) ? 'border-primary-500 bg-primary-600 text-white' : 'border-line text-ink-muted hover:border-gray-300 hover:text-ink',
            )}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>
      {presets && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
          <button type="button" onClick={() => onChange([1, 2, 3, 4, 5])} className="font-medium text-primary-600 hover:underline">Mon–Fri</button>
          <button type="button" onClick={() => onChange([1, 2, 3, 4, 5, 6])} className="font-medium text-primary-600 hover:underline">Mon–Sat</button>
          <button type="button" onClick={() => onChange([0, 6])} className="font-medium text-primary-600 hover:underline">Weekends</button>
          <button type="button" onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])} className="font-medium text-primary-600 hover:underline">Every day</button>
        </div>
      )}
    </div>
  );
}

/** Days from `from` to `to` (inclusive, local dates) that fall on `days` (empty = every day). */
export function countWeekdays(from: Date, to: Date, days: number[]): number {
  let n = 0;
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (d <= end) {
    if (!days.length || days.includes(d.getDay())) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
