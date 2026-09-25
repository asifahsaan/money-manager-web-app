import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { BrandMark } from './BrandMark';
import { PRIMARY_NAV, SETTINGS_NAV, ADMIN_NAV, type NavItem } from './navigation';

interface SidebarProps {
  collapsed?: boolean;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm',
          isActive ? 'nav-item-active' : 'nav-item-inactive',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetAccounts = useAccountStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');

  const handleLogout = () => {
    clearAuth();
    resetAccounts();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-16 items-center gap-2.5 px-5', collapsed && 'justify-center px-0')}>
        <BrandMark />
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-ink">Money Manager</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
        )}
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-line px-3 py-3">
        {isAdmin && <SidebarLink item={ADMIN_NAV} collapsed={collapsed} />}
        <SidebarLink item={SETTINGS_NAV} collapsed={collapsed} />

        {user && (
          <div className={cn('mt-2 flex items-center gap-3 rounded-lg px-2 py-2', collapsed && 'flex-col px-0')}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {initials(user.name)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink-muted">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-expense-light hover:text-expense"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
