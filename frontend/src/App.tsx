import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { TransactionsPage } from '@/pages/transactions/TransactionsPage';
import { WalletPage } from '@/pages/wallet/WalletPage';
import { WalletDetailPage } from '@/pages/wallet/WalletDetailPage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { StatisticsPage } from '@/pages/statistics/StatisticsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { useAuthStore } from '@/stores/auth.store';
import { AdminPage } from '@/pages/admin/AdminPage';
import { LandingPage } from '@/pages/landing/LandingPage';
import { setupNativeApp } from '@/lib/native';

const isNative = Capacitor.isNativePlatform();

function RootRoute() {
  const token = useAuthStore((s) => s.token);
  if (isNative) return <Navigate to={token ? '/transactions' : '/login'} replace />;
  return <LandingPage />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
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
    children: [
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/statistics', element: <StatisticsPage /> },
      { path: '/wallet', element: <WalletPage /> },
      { path: '/wallet/:id', element: <WalletDetailPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '/admin', element: <AdminPage /> },
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
            style: { borderRadius: '12px', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </AppInitializer>
    </QueryClientProvider>
  );
}
