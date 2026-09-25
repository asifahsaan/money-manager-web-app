import { resolveIcon } from '@/lib/category-icons';

export { resolveIcon };

interface Props {
  name: string | null;
  color: string | null;
  size?: number;
  containerSize?: number;
}

// Soft tile: the category color at low opacity behind an icon in full color.
// Reads well on both light and dark surfaces.
export function CategoryIcon({ name, color, size = 18, containerSize = 42 }: Props) {
  const base = /^#[0-9a-f]{6}$/i.test(color ?? '') ? color! : '#64748B';
  const Icon = resolveIcon(name);
  const radius = Math.round(containerSize * 0.3);

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center"
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: `${base}26`,
        borderRadius: `${radius}px`,
      }}
    >
      <Icon size={size} color={base} strokeWidth={2.1} />
    </div>
  );
}
