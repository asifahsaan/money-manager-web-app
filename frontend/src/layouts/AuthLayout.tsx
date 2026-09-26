import { Outlet, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';
import { BrandMark } from '@/components/shared/BrandMark';

const POINTS = [
  'Every rupee across cash, bank and JazzCash in one place',
  'Budgets that warn you before you overspend',
  'Savings goals, udhaar tracking and recurring bills',
];

const isNative = Capacitor.isNativePlatform();

export function AuthLayout() {
  const token = useAuthStore((s) => s.token);

  if (token) {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel — desktop */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        // Fixed colors: palette shades 700+ flip to light tints in dark mode
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #5b21b6 100%)' }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <BrandMark size={36} className="bg-white/15 ring-1 ring-white/25" />
          <span className="text-lg font-semibold tracking-tight">Money Manager</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Know where your money goes.
            <br />
            <span className="text-white/70">Decide where it grows.</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-white/85">
                <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" color="#6ee7b7" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck size={16} /> Your data is private and encrypted in transit.
        </p>
      </aside>

      {/* Form */}
      <main
        className="relative flex flex-1 items-center justify-center p-5"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Way back to the public site — the Android app has none */}
        {!isNative && (
          <Link
            to="/"
            className="absolute left-5 top-5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
            style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
        )}
        <div className="absolute right-5 top-5" style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 mt-10 flex items-center gap-2.5 lg:mt-0 lg:hidden">
            <BrandMark size={36} />
            <span className="text-lg font-semibold tracking-tight text-ink">Money Manager</span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
