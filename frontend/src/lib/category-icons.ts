import {
  Award, Banknote, BarChart2, Book, Bus, Camera, Car, Coffee, CreditCard, Dumbbell,
  Gamepad2, Gift, GraduationCap, Grid2x2, HandCoins, HeartPulse, Home, Lightbulb, Music,
  Phone, Pizza, Plane, Shield, Shirt, ShoppingCart, Sofa, Star, Tag, TrendingUp, Tv,
  Utensils, Wallet2, Wifi, Zap,
  type LucideIcon,
} from 'lucide-react';

// Category icons are stored by kebab-case name. Only these are offered in the
// picker and seeded for new accounts, so import exactly these instead of the
// whole lucide library (which added ~1 MB to the bundle).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  bus: Bus,
  utensils: Utensils,
  zap: Zap,
  home: Home,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  shirt: Shirt,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  dumbbell: Dumbbell,
  gift: Gift,
  'heart-pulse': HeartPulse,
  sofa: Sofa,
  'wallet-2': Wallet2,
  lightbulb: Lightbulb,
  banknote: Banknote,
  'trending-up': TrendingUp,
  award: Award,
  'bar-chart-2': BarChart2,
  star: Star,
  'hand-coins': HandCoins,
  'grid-2x2': Grid2x2,
  car: Car,
  plane: Plane,
  coffee: Coffee,
  pizza: Pizza,
  book: Book,
  music: Music,
  camera: Camera,
  phone: Phone,
  tv: Tv,
  wifi: Wifi,
  shield: Shield,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

// Accepts kebab-case ("heart-pulse") or PascalCase ("HeartPulse"); unknown → Tag.
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return CATEGORY_ICONS[name] ?? CATEGORY_ICONS[kebab] ?? Tag;
}
