import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authService.login(data);
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.token);
        toast.success('Welcome back!');
        navigate('/transactions', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Login failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-app-text mb-1">Welcome back</h2>
      <p className="text-sm text-app-text-secondary mb-6">
        Sign in to your account
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
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
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-app-text-secondary">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
