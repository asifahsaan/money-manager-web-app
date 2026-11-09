import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { useAuthStore } from '@/stores/auth.store';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// Route-level code splitting: each screen (and heavy deps like charts) loads on first visit.
const page = <T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const OverviewPage = page(() => import('@/pages/overview/OverviewPage'), 'OverviewPage');
const TransactionsPage = page(() => import('@/pages/transactions/TransactionsPage'), 'TransactionsPage');
const WalletPage = page(() => import('@/pages/wallet/WalletPage'), 'WalletPage');
const WalletDetailPage = page(() => import('@/pages/wallet/WalletDetailPage'), 'WalletDetailPage');
const CalendarPage = page(() => import('@/pages/calendar/CalendarPage'), 'CalendarPage');
const StatisticsPage = page(() => import('@/pages/statistics/StatisticsPage'), 'StatisticsPage');
const StatementsPage = page(() => import('@/pages/statements/StatementsPage'), 'StatementsPage');
const TaxReportPage = page(() => import('@/pages/tax/TaxReportPage'), 'TaxReportPage');
const SettingsPage = page(() => import('@/pages/settings/SettingsPage'), 'SettingsPage');
const ActivityLogPage = page(() => import('@/pages/activity/ActivityLogPage'), 'ActivityLogPage');
const PrivacyPage = page(() => import('@/pages/legal/PrivacyPage'), 'PrivacyPage');
const AdminPage = page(() => import('@/pages/admin/AdminPage'), 'AdminPage');
const LandingPage = page(() => import('@/pages/landing/LandingPage'), 'LandingPage');

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
import { setupNativeApp } from '@/lib/native';
import { RouteErrorScreen } from '@/components/shared/ConnectionStatus';

const isNative = Capacitor.isNativePlatform();

function RootRoute() {
  const token = useAuthStore((s) => s.token);
  if (isNative) return <Navigate to={token ? '/overview' : '/login'} replace />;
  return withSuspense(<LandingPage />);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
      // Try even when the device says offline, so a failure reaches the screen
      // instead of the request silently waiting (a blank page and Rs. 0).
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <RootRoute /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <DashboardLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: '/overview', element: withSuspense(<OverviewPage />) },
      { path: '/transactions', element: withSuspense(<TransactionsPage />) },
      { path: '/calendar', element: withSuspense(<CalendarPage />) },
      { path: '/statistics', element: withSuspense(<StatisticsPage />) },
      { path: '/wallet', element: withSuspense(<WalletPage />) },
      { path: '/wallet/:id', element: withSuspense(<WalletDetailPage />) },
      { path: '/settings', element: withSuspense(<SettingsPage />) },
      { path: '/statements', element: withSuspense(<StatementsPage />) },
      { path: '/tax-report', element: withSuspense(<TaxReportPage />) },
      { path: '/activity-log', element: withSuspense(<ActivityLogPage />) },
    ],
  },
  { path: '/admin', element: withSuspense(<AdminPage />) },
  { path: '/privacy', element: withSuspense(<PrivacyPage />) },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => {
    initialize();
    if (isNative) setupNativeApp();
  }, [initialize]);
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontSize: '14px',
              background: 'rgb(var(--c-surface-raised))',
              color: 'rgb(var(--c-text))',
              border: '1px solid rgb(var(--c-border))',
              boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </AppInitializer>
    </QueryClientProvider>
  );
}
