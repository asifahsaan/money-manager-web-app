import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface Props {
  name: string | null;
  color: string | null;
  size?: number;
  containerSize?: number;
}

export function resolveIcon(name: string | null): React.ComponentType<LucideProps> {
  if (!name) return LucideIcons.Tag as React.ComponentType<LucideProps>;

  if (name in LucideIcons) {
    const icon = LucideIcons[name as keyof typeof LucideIcons];
    if (typeof icon === 'function') return icon as React.ComponentType<LucideProps>;
  }

  const pascal = name
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join('');

  if (pascal in LucideIcons) {
    const icon = LucideIcons[pascal as keyof typeof LucideIcons];
    if (typeof icon === 'function') return icon as React.ComponentType<LucideProps>;
  }

  const lower = pascal.toLowerCase();
  const key = Object.keys(LucideIcons).find((k) => k.toLowerCase() === lower);
  if (key) {
    const icon = LucideIcons[key as keyof typeof LucideIcons];
    if (typeof icon === 'function') return icon as React.ComponentType<LucideProps>;
  }

  return LucideIcons.Tag as React.ComponentType<LucideProps>;
}

export function CategoryIcon({ name, color, size = 18, containerSize = 42 }: Props) {
  const bg = color ?? '#94A3B8';
  const Icon = resolveIcon(name);
  const radius = containerSize >= 40 ? 15 : Math.round(containerSize * 0.33);

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: bg,
        borderRadius: `${radius}px`,
        boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.08)',
      }}
    >
      <Icon size={size} color="white" />
    </div>
  );
}
