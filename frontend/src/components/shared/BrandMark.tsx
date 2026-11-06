import { useId } from 'react';
import { cn } from '@/lib/utils';

// App logo: an "A" (for Asif Ahsaan) whose right foot is a wallet, with bars
// rising inside — on the brand gradient. Same drawing as public/favicon.svg.
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const gradient = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('flex-shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gradient})`} />
      <g transform="translate(-2 -0.8)">
        <path d="M15.4 49 L29.5 16.5 Q31.5 12.5 33.5 16.5 L42 36" fill="none" stroke="#fff" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="33" y="35.25" width="20" height="18" rx="5" fill="#fff" />
        <rect x="44" y="39.75" width="12" height="9" rx="4.5" fill="#8B5CF6" stroke="#fff" strokeWidth="1.6" />
        <circle cx="48.6" cy="44.25" r="2" fill="#fff" />
        <rect x="23.2" y="45.25" width="3.3" height="6" rx="1.1" fill="#DDD6FE" />
        <rect x="27.8" y="40.75" width="3.3" height="10.5" rx="1.1" fill="#DDD6FE" />
      </g>
    </svg>
  );
}
