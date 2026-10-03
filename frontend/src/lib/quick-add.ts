import { format, subDays } from 'date-fns';
import type { TransactionType, Wallet } from '@/types';
import { walletBrand } from '@/lib/wallet-brands';

// Turns one line like "300 rider cash", "salary 180k meezan",
// "2000 meezan to jazzcash", "dinner 2.3k yesterday 9pm" into form values.
// Plain rules, no AI: amount, wallet(s), income/expense/transfer, date and
// time are picked out; whatever is left becomes the note.

export interface QuickAddResult {
  amount?: number;
  type?: TransactionType;
  walletId?: number;
  toWalletId?: number;
  date?: string; // yyyy-MM-dd
  time?: string; // HH:MM
  description: string;
}

const INCOME_WORDS = ['salary', 'income', 'received', 'receive', 'got', 'mila', 'mili', 'mile', 'aya', 'aaya', 'aayi', 'refund', 'bonus', 'profit', 'cashback', 'tankhwa', 'tankhwah'];
const TRANSFER_WORDS = ['transfer', 'transferred', 'moved', 'move'];
const FILLER = new Set(['rs', 'rs.', 'pkr', 'rupees', 'rupay', 'from', 'se', 'via', 'in', 'on', 'for', 'ka', 'ki', 'ke', 'ko', 'paid', 'pay', 'spent', 'by', 'with', 'at', 'to']);

export function parseQuickAdd(input: string, wallets: Wallet[], now = new Date()): QuickAddResult {
  let text = ` ${input.trim()} `;
  const out: QuickAddResult = { description: '' };

  // time first, so "9:30" isn't read as an amount — "9pm", "9:30 pm", "21:15"
  const t12 = text.match(/\s(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i);
  const t24 = text.match(/\s([01]?\d|2[0-3]):([0-5]\d)(?=\s)/);
  if (t12) {
    let h = Number(t12[1]) % 12;
    if (t12[3].toLowerCase() === 'pm') h += 12;
    out.time = `${String(h).padStart(2, '0')}:${t12[2] ?? '00'}`;
    text = text.replace(t12[0], ' ');
  } else if (t24) {
    out.time = `${t24[1].padStart(2, '0')}:${t24[2]}`;
    text = text.replace(t24[0], ' ');
  }

  // date words
  const words = () => text.toLowerCase().split(/\s+/).filter(Boolean);
  const drop = (w: string) => { text = text.replace(new RegExp(`\\s${escape(w)}(?=\\s)`, 'i'), ' '); };
  for (const w of words()) {
    if (w === 'yesterday' || w === 'kal') { out.date = format(subDays(now, 1), 'yyyy-MM-dd'); drop(w); }
    else if (w === 'today' || w === 'aaj' || w === 'aj') { out.date = format(now, 'yyyy-MM-dd'); drop(w); }
    else if (w === 'parson' || w === 'parso') { out.date = format(subDays(now, 2), 'yyyy-MM-dd'); drop(w); }
  }

  // amount: "300", "1,500", "2.5k", "180k", "3 hazar"
  const amt = text.match(/\s\+?(\d[\d,]*(?:\.\d+)?)\s?(k|hazar|hazaar|thousand|lac|lakh)?(?=\s)/i);
  if (amt) {
    let n = Number(amt[1].replace(/,/g, ''));
    const unit = amt[2]?.toLowerCase();
    if (unit === 'k' || unit === 'hazar' || unit === 'hazaar' || unit === 'thousand') n *= 1000;
    if (unit === 'lac' || unit === 'lakh') n *= 100_000;
    if (n > 0) out.amount = Math.round(n * 100) / 100;
    if (amt[0].includes('+')) out.type = 'INCOME';
    text = text.replace(amt[0], ' ');
  }

  // wallets, in the order they appear
  const found: { walletId: number; index: number; token: string }[] = [];
  const usedTokens = new Set<string>(); // one word names one wallet (two "Cash" wallets ≠ a transfer)
  for (const w of wallets.filter((x) => !x.archived)) {
    const keys = walletKeys(w);
    for (const token of words()) {
      if (usedTokens.has(token)) continue;
      if (keys.some((k) => k === token || (token.length >= 4 && k.startsWith(token)))) {
        usedTokens.add(token);
        if (!found.some((f) => f.walletId === w.id)) found.push({ walletId: w.id, index: text.toLowerCase().indexOf(` ${token}`), token });
        break;
      }
    }
  }
  found.sort((a, b) => a.index - b.index);
  const lower = words();
  const isTransfer = found.length >= 2 || lower.some((w) => TRANSFER_WORDS.includes(w));
  if (found.length >= 2) {
    out.type = 'TRANSFER';
    out.walletId = found[0].walletId;
    out.toWalletId = found[1].walletId;
  } else if (found.length === 1) {
    out.walletId = found[0].walletId;
  }
  for (const f of found.slice(0, 2)) drop(f.token);
  if (isTransfer) for (const w of TRANSFER_WORDS) drop(w);

  if (!out.type && words().some((w) => INCOME_WORDS.includes(w))) out.type = 'INCOME';

  // what's left is the note — trim filler at its edges ("from", "to", "rs") but
  // keep it inside ("Dinner with family", "UOL to Office")
  const rest = words();
  while (rest.length && FILLER.has(rest[0])) rest.shift();
  while (rest.length && FILLER.has(rest[rest.length - 1])) rest.pop();
  const original = input.split(/\s+/);
  out.description = rest
    .map((w) => original.find((o) => o.toLowerCase() === w) ?? w) // keep the user's capitalisation
    .join(' ');
  if (out.description) out.description = out.description[0].toUpperCase() + out.description.slice(1);
  return out;
}

/** Words that name a wallet: its name, the words in it, and its bank's names/badge. */
function walletKeys(w: Wallet): string[] {
  const name = w.name.toLowerCase();
  const keys = [name, ...name.split(/\s+/).filter((x) => x.length >= 3 && x !== 'bank' && x !== 'wallet' && x !== 'account')];
  const brand = walletBrand(w);
  if (brand) keys.push(brand.id, brand.mark.toLowerCase(), ...brand.name.toLowerCase().split(/\s+/).filter((x) => x.length >= 3 && x !== 'bank'));
  if (w.type === 'CASH') keys.push('cash', 'naqd');
  return [...new Set(keys)];
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
