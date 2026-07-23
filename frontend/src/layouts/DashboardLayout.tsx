import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { accountService } from '@/services/account.service';
import { Sidebar } from '@/components/shared/Sidebar';
import { BottomNav } from '@/components/shared/BottomNav';
import { AccountSelector } from '@/components/shared/AccountSelector';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const { token, isInitialized } = useAuthStore();
  const { setAccounts } = useAccountStore();
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!token) return;

    accountService
      .list()
      .then((res) => {
        if (res.success) {
          setAccounts(res.data);
        }
      })
      .catch(() => {
        // Token may be expired — axios interceptor will redirect to /login
      })
      .finally(() => setLoadingAccounts(false));
  }, [token, setAccounts]);

  if (!isInitialized) return <PageLoader />;
  if (!token) return <Navigate to="/login" replace />;
  if (loadingAccounts) return <PageLoader />;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="glass-panel flex items-center justify-between border-b border-gray-200/60 px-4 py-3 flex-shrink-0"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3">
            {/* Collapse toggle — desktop */}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className={cn(
                'hidden lg:flex h-8 w-8 items-center justify-center rounded-lg',
                'text-app-text-secondary hover:bg-gray-100 transition-colors',
              )}
            >
              <Menu size={18} />
            </button>

            {/* Mobile brand name */}
            <span className="lg:hidden text-base font-bold text-app-text">
              Money Manager
            </span>

            <AccountSelector />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
