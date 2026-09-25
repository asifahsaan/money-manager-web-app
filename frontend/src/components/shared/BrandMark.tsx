import { cn } from '@/lib/utils';

// App logo: a rising line inside a rounded square, drawn in the brand color.
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('flex flex-shrink-0 items-center justify-center rounded-[10px] bg-primary text-white', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M3 17l5.5-5.5 4 4L21 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15 7h6v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
