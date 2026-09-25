import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PanelLeft, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { useQuickAddStore } from '@/stores/quick-add.store';
import { accountService } from '@/services/account.service';
import { Sidebar } from '@/components/shared/Sidebar';
import { BottomNav } from '@/components/shared/BottomNav';
import { AccountSelector } from '@/components/shared/AccountSelector';
import { WhatsNewButton } from '@/components/shared/WhatsNew';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { BrandMark } from '@/components/shared/BrandMark';
import { pageTitle } from '@/components/shared/navigation';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';
import { PageLoader } from '@/components/ui/LoadingSpinner';

const COLLAPSE_KEY = 'mm_sidebar_collapsed';

export function DashboardLayout() {
  const { token, isInitialized } = useAuthStore();
  const { setAccounts, activeAccountId, accounts } = useAccountStore();
  const { open: quickAddOpen, setOpen: setQuickAddOpen } = useQuickAddStore();
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { pathname } = useLocation();

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

  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // ignore
      }
      return !c;
    });
  };

  if (!isInitialized) return <PageLoader />;
  if (!token) return <Navigate to="/login" replace />;
  if (loadingAccounts) return <PageLoader />;

  const currency = accounts.find((a) => a.id === activeAccountId)?.currency ?? 'Rs.';

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar — desktop only */}
      <div className="hidden flex-shrink-0 lg:flex">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:px-6"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(4rem + env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink lg:flex"
            >
              <PanelLeft size={18} />
            </button>
            <BrandMark size={28} className="lg:hidden" />
            <h1 className="truncate text-base font-semibold tracking-tight text-ink lg:text-lg">
              {pageTitle(pathname)}
            </h1>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <div className="hidden sm:block">
              <AccountSelector />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <WhatsNewButton />
            <ThemeToggle />
            {activeAccountId && (
              <button
                onClick={() => setQuickAddOpen(true)}
                className="ml-1 hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 md:flex"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add transaction
              </button>
            )}
          </div>
        </header>

        {/* Account switcher gets its own row on small phones */}
        <div className="border-b border-line bg-surface px-4 py-2 sm:hidden">
          <AccountSelector />
        </div>

        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>

      {quickAddOpen && activeAccountId && (
        <TransactionModal accountId={activeAccountId} currency={currency} onClose={() => setQuickAddOpen(false)} />
      )}
    </div>
  );
}
