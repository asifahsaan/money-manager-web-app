// Card themes for Pakistani banks and mobile wallets.
//
// The chosen brand is stored in the wallet's existing `icon` column as
// "brand:<id>" (no migration needed). Wallets without one are matched by
// name, so "Meezan Bank" or "JazzCash" get their theme automatically;
// "brand:none" means the user picked a plain colour on purpose.
//
// Colours are close to each brand's public colours, not official values.
// `mark` is a short text badge shown in place of the brand's logo.
import type { Wallet, WalletType } from '@/types';

export interface WalletBrand {
  id: string;
  name: string;
  kind: 'bank' | 'wallet';
  mark: string;
  from: string; // gradient start
  to: string; // gradient end
  accent: string; // badge text colour on the white logo tile
  match: RegExp;
}

export const WALLET_BRANDS: WalletBrand[] = [
  { id: 'meezan', name: 'Meezan Bank', kind: 'bank', mark: 'MZN', from: '#7B2C83', to: '#3F1450', accent: '#6B2275', match: /meezan/i },
  { id: 'alfalah', name: 'Bank Alfalah', kind: 'bank', mark: 'BAF', from: '#E0262C', to: '#7A0D12', accent: '#C8161D', match: /al[\s-]?fala/i },
  { id: 'hbl', name: 'HBL', kind: 'bank', mark: 'HBL', from: '#00876F', to: '#004536', accent: '#00765F', match: /\bhbl\b|habib bank(?! al)/i },
  { id: 'ubl', name: 'UBL', kind: 'bank', mark: 'UBL', from: '#0B63B0', to: '#06305A', accent: '#0A5AA0', match: /\bubl\b|united bank/i },
  { id: 'mcb', name: 'MCB Bank', kind: 'bank', mark: 'MCB', from: '#0E7A43', to: '#053D21', accent: '#0B6B3A', match: /\bmcb\b|muslim commercial/i },
  { id: 'abl', name: 'Allied Bank', kind: 'bank', mark: 'ABL', from: '#1A4C8B', to: '#0B2347', accent: '#163F75', match: /\babl\b|allied/i },
  { id: 'nbp', name: 'National Bank', kind: 'bank', mark: 'NBP', from: '#0A7D4F', to: '#033D26', accent: '#086B44', match: /\bnbp\b|national bank/i },
  { id: 'bahl', name: 'Bank AL Habib', kind: 'bank', mark: 'BAH', from: '#B5121B', to: '#5C070C', accent: '#A10F17', match: /al[\s-]?habib/i },
  { id: 'scb', name: 'Standard Chartered', kind: 'bank', mark: 'SC', from: '#0473EA', to: '#0F3A6E', accent: '#0466CF', match: /standard chartered|\bscb\b/i },
  { id: 'faysal', name: 'Faysal Bank', kind: 'bank', mark: 'FBL', from: '#0D7A3E', to: '#0A3B22', accent: '#0B6A36', match: /faysal|faisal bank/i },
  { id: 'askari', name: 'Askari Bank', kind: 'bank', mark: 'AKB', from: '#1C5BA8', to: '#0C2A52', accent: '#184F92', match: /askari/i },
  { id: 'bop', name: 'Bank of Punjab', kind: 'bank', mark: 'BOP', from: '#1F5FA8', to: '#0E2C55', accent: '#1A5392', match: /\bbop\b|bank of punjab/i },
  { id: 'bankislami', name: 'BankIslami', kind: 'bank', mark: 'BIP', from: '#0F8A5F', to: '#07442F', accent: '#0D7752', match: /bank\s?islami/i },
  { id: 'dib', name: 'Dubai Islamic Bank', kind: 'bank', mark: 'DIB', from: '#1B7F5B', to: '#0B3D2C', accent: '#176E4F', match: /dubai islamic|\bdib\b/i },
  { id: 'habibmetro', name: 'HabibMetro', kind: 'bank', mark: 'HMB', from: '#118049', to: '#063D22', accent: '#0F6F40', match: /habib\s?metro/i },
  { id: 'js', name: 'JS Bank', kind: 'bank', mark: 'JS', from: '#2B3990', to: '#141B47', accent: '#26327E', match: /\bjs bank\b/i },
  { id: 'soneri', name: 'Soneri Bank', kind: 'bank', mark: 'SNB', from: '#B8862B', to: '#5E4211', accent: '#9C7022', match: /soneri/i },
  { id: 'jazzcash', name: 'JazzCash', kind: 'wallet', mark: 'JC', from: '#E3242B', to: '#F7A30A', accent: '#D21F26', match: /jazz\s?cash|\bjazz\b/i },
  { id: 'easypaisa', name: 'Easypaisa', kind: 'wallet', mark: 'ep', from: '#1DB45A', to: '#0A5A2C', accent: '#14A04E', match: /easy\s?paisa/i },
  { id: 'sadapay', name: 'SadaPay', kind: 'wallet', mark: 'SP', from: '#1FC8A9', to: '#0B6F5E', accent: '#13A88D', match: /sada\s?pay/i },
  { id: 'nayapay', name: 'NayaPay', kind: 'wallet', mark: 'NP', from: '#F2672A', to: '#8A2F0B', accent: '#D9561C', match: /naya\s?pay/i },
  { id: 'zindigi', name: 'Zindigi', kind: 'wallet', mark: 'Z', from: '#6C2BD9', to: '#33106E', accent: '#5E23C2', match: /zindigi/i },
  { id: 'upaisa', name: 'UPaisa', kind: 'wallet', mark: 'UP', from: '#0B63B0', to: '#F2B705', accent: '#0A5AA0', match: /u\s?paisa/i },
  { id: 'payoneer', name: 'Payoneer', kind: 'wallet', mark: 'P', from: '#FF4800', to: '#7A2200', accent: '#E04000', match: /payoneer/i },
];

const BRAND_BY_ID = new Map(WALLET_BRANDS.map((b) => [b.id, b]));

/** Brand chosen or detected for a wallet; null = plain colour card. */
export function walletBrand(w: Pick<Wallet, 'icon' | 'name'>): WalletBrand | null {
  if (w.icon?.startsWith('brand:')) return BRAND_BY_ID.get(w.icon.slice(6)) ?? null;
  return WALLET_BRANDS.find((b) => b.match.test(w.name)) ?? null;
}

/** Brand an already-typed name would get, for the "detected" hint in the form. */
export function detectBrand(name: string): WalletBrand | null {
  return WALLET_BRANDS.find((b) => b.match.test(name)) ?? null;
}

const TYPE_DEFAULT: Record<WalletType, string> = {
  CASH: '#10B981',
  BANK: '#3B82F6',
  CARD: '#8B5CF6',
  E_WALLET: '#EF4444',
  OTHER: '#6B7280',
};

/** Darken a #rrggbb colour by mixing it with black. */
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export interface WalletTheme {
  brand: WalletBrand | null;
  background: string;
  accent: string;
}

export function walletTheme(w: Pick<Wallet, 'icon' | 'name' | 'color' | 'type'>): WalletTheme {
  const brand = walletBrand(w);
  if (brand) {
    return { brand, background: `linear-gradient(135deg, ${brand.from} 0%, ${brand.to} 100%)`, accent: brand.accent };
  }
  const base = w.color ?? TYPE_DEFAULT[w.type] ?? '#6B7280';
  return { brand: null, background: `linear-gradient(135deg, ${base} 0%, ${shade(base, 0.45)} 100%)`, accent: shade(base, 0.15) };
}
