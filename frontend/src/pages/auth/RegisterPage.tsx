import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { accountService } from '@/services/account.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setAccounts = useAccountStore((s) => s.setAccounts);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (res.success && res.data) {
        setAuth(res.data.user, res.data.token);

        // Fetch accounts so the store is populated immediately
        try {
          const accountsRes = await accountService.list();
          if (accountsRes.success) {
            setAccounts(accountsRes.data);
          }
        } catch {
          // Non-fatal — dashboard will refetch
        }

        toast.success('Account created! Welcome to Money Manager.');
        navigate('/transactions', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-app-text mb-1">Create account</h2>
      <p className="text-sm text-app-text-secondary mb-6">
        Start tracking your finances today
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Full Name" required error={errors.name?.message}>
          <Input
            {...register('name')}
            type="text"
            placeholder="Your name"
            autoComplete="name"
            error={!!errors.name}
            leftIcon={<User size={16} />}
          />
        </FormField>

        <FormField label="Email" required error={errors.email?.message}>
          <Input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={!!errors.email}
            leftIcon={<Mail size={16} />}
          />
        </FormField>

        <FormField label="Password" required error={errors.password?.message}>
          <Input
            {...register('password')}
            type="password"
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            error={!!errors.password}
            leftIcon={<Lock size={16} />}
          />
        </FormField>

        <FormField
          label="Confirm Password"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            {...register('confirmPassword')}
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            leftIcon={<Lock size={16} />}
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting}
          className="mt-2"
        >
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-app-text-secondary">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
