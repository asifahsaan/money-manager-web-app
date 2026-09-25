import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  PieChart,
  Wallet,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

// Primary destinations — shared by the desktop sidebar and the mobile tab bar.
export const PRIMARY_NAV: NavItem[] = [
  { to: '/overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', shortLabel: 'Activity', icon: ArrowLeftRight },
  { to: '/calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarDays },
  { to: '/statistics', label: 'Statistics', shortLabel: 'Stats', icon: PieChart },
  { to: '/wallet', label: 'Wallets & Plans', shortLabel: 'Wallets', icon: Wallet },
];

export const SETTINGS_NAV: NavItem = { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings };
export const ADMIN_NAV: NavItem = { to: '/admin', label: 'Admin', shortLabel: 'Admin', icon: Shield };

const TITLES: [string, string][] = [
  ['/overview', 'Overview'],
  ['/transactions', 'Transactions'],
  ['/calendar', 'Calendar'],
  ['/statistics', 'Statistics'],
  ['/wallet/', 'Wallet details'],
  ['/wallet', 'Wallets & Plans'],
  ['/settings', 'Settings'],
];

export function pageTitle(pathname: string): string {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Money Manager';
}
