import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { DueDebtsBell } from '@/components/shared/DueDebtsBell';
import { BrandMark } from '@/components/shared/BrandMark';
import { pageTitle } from '@/components/shared/navigation';
import { TransactionModal } from '@/pages/transactions/components/TransactionModal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAutoRecurring } from '@/lib/use-auto-recurring';
import { useConnectionProblem, useConnectionWatcher, usePageDataMissing } from '@/lib/use-connection';
import { ConnectionBanner, ConnectionErrorScreen, RefreshButton } from '@/components/shared/ConnectionStatus';

const COLLAPSE_KEY = 'mm_sidebar_collapsed';

export function DashboardLayout() {
  const { token, isInitialized } = useAuthStore();
  const { setAccounts, activeAccountId, accounts } = useAccountStore();
  useAutoRecurring(token ? activeAccountId : null);
  const { open: quickAddOpen, setOpen: setQuickAddOpen } = useQuickAddStore();
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const qc = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { pathname } = useLocation();

  const loadAccounts = useCallback(
    () =>
      accountService
        .list()
        .then((res) => {
          if (res.success) {
            setAccounts(res.data);
          }
        })
        .catch(() => {
          // Expired token: axios interceptor redirects to /login. Network: the connection watcher retries.
        })
        .finally(() => setLoadingAccounts(false)),
    [setAccounts],
  );

  useEffect(() => {
    if (token) void loadAccounts();
  }, [token, loadAccounts]);

  const refresh = useCallback(
    () => Promise.all([loadAccounts(), qc.invalidateQueries()]),
    [loadAccounts, qc],
  );

  const problem = useConnectionProblem();
  const pageDataMissing = usePageDataMissing();
  useConnectionWatcher(() => void refresh());

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
  // Nothing to show: accounts never loaded, or this page's data failed while the connection is down
  const showError = accounts.length === 0 ? !!problem : !!problem && pageDataMissing;

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
            <RefreshButton onRefresh={refresh} />
            <WhatsNewButton />
            <DueDebtsBell />
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

        {problem && !showError && <ConnectionBanner problem={problem} onRetry={refresh} />}

        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {showError && <ConnectionErrorScreen problem={problem} onRetry={refresh} />}
          {/* Stays mounted while hidden, so its requests can retry and bring it back */}
          <div className={showError ? 'hidden' : 'contents'}>
            <Outlet />
          </div>
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
