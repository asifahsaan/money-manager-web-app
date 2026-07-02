import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PAGE_LABELS: Record<string, string> = {
  '/transactions': 'Transactions',
  '/calendar': 'Calendar',
  '/statistics': 'Statistics',
  '/wallet': 'Wallet',
  '/settings': 'Settings',
};

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const label = PAGE_LABELS[pathname] ?? 'Page';

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <Construction size={28} className="text-primary-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-app-text">{label}</h2>
        <p className="mt-1 text-sm text-app-text-secondary">
          Coming in Phase 2. The foundation is ready!
        </p>
      </div>
    </div>
  );
}
