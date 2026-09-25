import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';
import { cn } from '@/lib/utils';

const NEXT: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'system', system: 'light' };
const META: Record<ThemePreference, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: 'Light theme' },
  dark: { icon: Moon, label: 'Dark theme' },
  system: { icon: Monitor, label: 'System theme' },
};

// Header button: cycles Light → Dark → System.
export function ThemeToggle() {
  const { preference, setPreference } = useThemeStore();
  const { icon: Icon, label } = META[preference];
  return (
    <button
      onClick={() => setPreference(NEXT[preference])}
      title={`${label} — click to change`}
      aria-label={`${label}, click to change`}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
    >
      <Icon size={18} />
    </button>
  );
}

// Segmented control for the Settings page.
export function ThemeSegmented() {
  const { preference, setPreference } = useThemeStore();
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label="Theme">
      {(['light', 'dark', 'system'] as const).map((p) => {
        const { icon: Icon } = META[p];
        return (
          <button
            key={p}
            role="radio"
            aria-checked={preference === p}
            onClick={() => setPreference(p)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              preference === p ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon size={15} />
            {p}
          </button>
        );
      })}
    </div>
  );
}
