import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PRIMARY_NAV } from './navigation';

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      <div className="flex h-16 items-stretch px-1">
        {PRIMARY_NAV.map(({ to, icon: Icon, shortLabel }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-primary-50',
                  )}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.3 : 2} />
                </span>
                <span className={cn(isActive && 'font-semibold')}>{shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
