import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'income' | 'expense' | 'transfer' | 'neutral' | 'primary';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  income: 'bg-income-light text-income-dark',
  expense: 'bg-expense-light text-expense-dark',
  transfer: 'bg-transfer-light text-transfer',
  neutral: 'bg-gray-100 text-gray-600',
  primary: 'bg-primary-100 text-primary-700',
};

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
