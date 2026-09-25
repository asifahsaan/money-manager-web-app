import { Outlet, Navigate, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { BrandMark } from '@/components/shared/BrandMark';

const POINTS = [
  'Every rupee across cash, bank and JazzCash in one place',
  'Budgets that warn you before you overspend',
  'Savings goals, udhaar tracking and recurring bills',
];

export function AuthLayout() {
  const token = useAuthStore((s) => s.token);

  if (token) {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel — desktop */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800 p-10 text-white lg:flex">
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
                <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-emerald-300" />
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
        className="flex flex-1 items-center justify-center p-5"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark size={36} />
            <span className="text-lg font-semibold tracking-tight text-ink">Money Manager</span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
