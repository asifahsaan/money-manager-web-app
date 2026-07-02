import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hint?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
  hint,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium text-app-text">
        {label}
        {required && <span className="ml-0.5 text-expense">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-app-text-secondary">{hint}</p>
      )}
      {error && <p className="text-xs text-expense">{error}</p>}
    </div>
  );
}
