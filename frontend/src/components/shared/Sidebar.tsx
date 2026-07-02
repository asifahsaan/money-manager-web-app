import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  Calendar,
  Target,
  Wallet,
  LogOut,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';

const navItems = [
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/statistics', icon: Target, label: 'Statistics' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetAccounts = useAccountStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    clearAuth();
    resetAccounts();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'glass-panel flex h-full flex-col border-r border-white/60',
        collapsed ? 'w-16' : 'w-60',
        'transition-all duration-200',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-white/60',
          collapsed && 'justify-center px-2',
        )}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #fb923c)',
            boxShadow: '0 12px 25px rgba(217,119,6,0.25)',
          }}
        >
          <TrendingUp size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">Money Manager</h1>
            <span className="text-[11px] text-gray-400">Personal Finance</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-150',
                isActive ? 'nav-item-active' : 'nav-item-inactive',
                collapsed && 'justify-center px-2',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-amber-700' : 'text-current',
                  )}
                />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/60 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-gray-700 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-150',
              isActive ? 'nav-item-active' : 'nav-item-inactive',
              collapsed && 'justify-center px-2',
            )
          }
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-150',
            'text-gray-400 hover:bg-red-50/80 hover:text-red-500',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
