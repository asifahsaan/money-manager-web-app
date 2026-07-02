import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, Calendar, Target, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaction' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/statistics', icon: Target, label: 'Statistic' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
];

export function BottomNav() {
  return (
    <nav className="glass-panel fixed bottom-0 left-0 right-0 z-40 border-t border-white/50">
      <div className="flex items-stretch h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all rounded-xl mx-1 my-1',
                isActive
                  ? 'text-amber-800 bg-amber-50'
                  : 'text-gray-400 hover:text-gray-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  className={cn(isActive ? 'text-amber-700' : 'text-current')}
                />
                <span className={cn(isActive && 'font-bold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
