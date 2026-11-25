import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

type Props = Omit<ComponentPropsWithoutRef<typeof Input>, 'type' | 'rightIcon'>;

/** A password box with an eye button to check what was typed. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
