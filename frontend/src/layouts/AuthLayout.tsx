import { Outlet, Navigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export function AuthLayout() {
  const token = useAuthStore((s) => s.token);

  if (token) {
    return <Navigate to="/transactions" replace />;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-app-text">Money Manager</h1>
          <p className="text-sm text-app-text-secondary mt-1">
            Track your finances with ease
          </p>
        </div>

        {/* Auth form card */}
        <div className="bg-white rounded-2xl shadow-lg border border-app-border p-8">
          <Outlet />
        </div>

        <p className="text-center text-xs text-app-text-secondary mt-6">
          Your financial data is stored securely.
        </p>
      </div>
    </div>
  );
}
