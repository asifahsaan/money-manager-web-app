import { Banknote, CreditCard, Eye, EyeOff, LucideIcon, Pencil, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import type { Wallet, WalletType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { walletTheme, type WalletTheme } from '@/lib/wallet-brands';

export const TYPE_ICON: Record<WalletType, LucideIcon> = {
  CASH: Banknote,
  BANK: WalletIcon,
  CARD: CreditCard,
  E_WALLET: Smartphone,
  OTHER: WalletIcon,
};

export const TYPE_LABEL: Record<WalletType, string> = {
  CASH: 'Cash in hand',
  BANK: 'Bank account',
  CARD: 'Card',
  E_WALLET: 'Mobile wallet',
  OTHER: 'Other',
};

/** White tile with the brand's short mark, or the wallet-type icon. */
/**
 * The brand's short mark (or the wallet-type icon) on a tile.
 * "tile" = white tile for use on the coloured card; "solid" = brand-coloured
 * tile with a white mark, for lists on a plain background.
 */
export function WalletLogo({ theme, type, size = 40, variant = 'tile' }: { theme: WalletTheme; type: WalletType; size?: number; variant?: 'tile' | 'solid' }) {
  const Icon = TYPE_ICON[type] ?? WalletIcon;
  const mark = theme.brand?.mark;
  const solid = variant === 'solid';
  const fg = solid ? '#ffffff' : theme.accent;
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center shadow-sm', size >= 36 ? 'rounded-xl' : 'rounded-lg')}
      // fixed colours: the palette's bg-white turns dark in dark mode
      style={{ width: size, height: size, background: solid ? theme.background : '#ffffff' }}
    >
      {mark ? (
        <span className="font-black leading-none tracking-tight" style={{ color: fg, fontSize: mark.length > 2 ? size * 0.3 : size * 0.38 }}>
          {mark}
        </span>
      ) : (
        <Icon size={size * 0.5} color={fg} />
      )}
    </div>
  );
}

/** Second line under a wallet name: its bank (if the name doesn't already say it) or its type. */
export function walletSubtitle(w: Pick<Wallet, 'name' | 'type' | 'icon' | 'color'>): string {
  const brand = walletTheme(w).brand;
  if (brand && !w.name.toLowerCase().includes(brand.name.toLowerCase().split(' ')[0])) return brand.name;
  return TYPE_LABEL[w.type];
}

interface Props {
  wallet: Wallet;
  currency: string;
  hidden: boolean;
  onOpen: () => void;
  onToggleIncluded: () => void;
  onToggleHidden: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

export function WalletCard({ wallet: w, currency, hidden, onOpen, onToggleIncluded, onToggleHidden, onEdit }: Props) {
  const theme = walletTheme(w);
  const balance = Number(w.currentBalance);
  const subtitle = walletSubtitle(w);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl p-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg',
        !w.includedInTotal && 'opacity-70 saturate-50',
      )}
      style={{ background: theme.background }}
    >
      {/* Decorative rings, like a bank card — clipped in their own layer so the
          card never overflows and can't be scrolled sideways by focus */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px]" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-32 w-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>

      <div className="relative flex items-start gap-3">
        <WalletLogo theme={theme} type={w.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight" title={w.name}>{w.name}</p>
          <p className="truncate text-[11px] font-medium text-white/70">{subtitle}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleIncluded(); }}
            title={w.includedInTotal ? 'Included in total — tap to exclude' : 'Excluded from total — tap to include'}
            className="relative mr-1 h-[18px] w-8 shrink-0 rounded-full transition-colors"
            style={{ backgroundColor: w.includedInTotal ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)' }}
          >
            <span
              className={cn(
                'absolute left-0 top-[3px] h-3 w-3 rounded-full transition-transform',
                w.includedInTotal ? 'translate-x-[17px]' : 'translate-x-[3px]',
              )}
              style={{ backgroundColor: w.includedInTotal ? theme.accent : '#ffffff' }}
            />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
            title={hidden ? 'Show balance' : 'Hide balance'}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Edit wallet"
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Balance</p>
          <p className="whitespace-nowrap text-2xl font-black tabular-nums leading-tight">
            {hidden ? '••••••' : formatCurrency(balance, currency)}
          </p>
        </div>
        {!w.includedInTotal && (
          <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold">Excluded</span>
        )}
        {w.includedInTotal && balance < 0 && !hidden && (
          <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold">Overdrawn</span>
        )}
      </div>
    </div>
  );
}
