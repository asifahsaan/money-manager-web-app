import { format, parseISO } from 'date-fns';
import type { Debt } from '@/types';
import { formatCurrency } from '@/lib/utils';
import type { ReminderLanguage } from '@/lib/debt-reminders';

// One message covering everything between the user and one person: every
// open loan in either direction, each with its payments, and the net total.

/** "  Wasif  " and "wasif" are the same person. */
export const personKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** The person's debts: same name, or the same saved email/phone as any of them. */
export function debtsOfPerson(all: Debt[], name: string): Debt[] {
  const key = personKey(name);
  const byName = all.filter((d) => personKey(d.personName) === key);
  const emails = new Set(byName.map((d) => d.contactEmail?.trim().toLowerCase()).filter(Boolean));
  const phones = new Set(byName.map((d) => d.contactPhone?.replace(/\D/g, '')).filter((p) => p && p.length >= 7));
  return all.filter(
    (d) =>
      personKey(d.personName) === key ||
      (d.contactEmail && emails.has(d.contactEmail.trim().toLowerCase())) ||
      (d.contactPhone && phones.has(d.contactPhone.replace(/\D/g, ''))),
  );
}

/** Other names that look like the same person ("Wasif" ~ "Wasif Ali") — offered, never merged silently. */
export function similarNames(all: Debt[], name: string, exclude: Set<number>): string[] {
  const key = personKey(name);
  const first = key.split(' ')[0];
  const names = new Map<string, string>();
  for (const d of all) {
    if (exclude.has(d.id)) continue;
    const k = personKey(d.personName);
    if (k === key) continue;
    if (k.startsWith(`${key} `) || key.startsWith(`${k} `) || (first.length >= 3 && k.split(' ')[0] === first)) names.set(k, d.personName.trim());
  }
  return [...names.values()];
}

export interface StatementInput {
  personName: string;
  /** With their full `entries` loaded */
  debts: Debt[];
  walletName: (id: number | null) => string | undefined;
  lang: ReminderLanguage;
  ownerName: string;
  currency: string;
}

const day = (iso: string) => format(parseISO(iso.slice(0, 10)), 'd MMM yyyy');

export function statementSubject(personName: string, lang: ReminderLanguage) {
  return lang === 'ur' ? `${personName.trim()} — hisaab ki tafseel` : `Statement of account — ${personName.trim()}`;
}

export function statementText({ personName, debts, walletName, lang, ownerName, currency }: StatementInput): string {
  const ur = lang === 'ur';
  const m = (v: string | number) => formatCurrency(Math.abs(Number(v)), currency);
  const name = personName.trim();
  const sorted = [...debts].sort((a, b) => a.date.localeCompare(b.date));
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en);

  const blocks = sorted.map((d, i) => {
    const owedToMe = d.type === 'RECEIVABLE';
    const via = walletName(d.walletId);
    const lines: string[] = [];
    lines.push(`${i + 1}) ${day(d.date)}${d.description?.trim() ? ` — ${d.description.trim()}` : ''}`);
    lines.push(
      `   ${owedToMe ? L('Aap ko diye', 'Lent to you') : L('Aap se liye', 'Borrowed from you')}: ${m(d.totalAmount)}${via ? ` (${via})` : ''}`,
    );
    const entries = [...(d.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of entries) {
      const w = walletName(e.walletId);
      const label = owedToMe ? L('Wapis mile', 'Paid back to me') : L('Wapis kiye', 'Repaid by me');
      lines.push(`   ${day(e.date)}  ${label}${w ? ` (${w})` : ''}: ${m(e.amount)}${e.note?.trim() ? ` — ${e.note.trim()}` : ''}`);
    }
    if (d.status === 'CLOSED') {
      lines.push(`   ${L('Poora wapis ho chuka ✓', 'Fully settled ✓')}`);
    } else {
      lines.push(`   ${L('Baqi', 'Outstanding')}: ${m(d.remainingAmount)}${d.dueDate ? ` · ${L('Wapsi', 'Due')}: ${day(d.dueDate)}` : ''}`);
    }
    return lines.join('\n');
  });

  // Net: what they owe me minus what I owe them
  const net = sorted.reduce((t, d) => (d.status === 'CLOSED' ? t : t + (d.type === 'RECEIVABLE' ? 1 : -1) * Number(d.remainingAmount)), 0);
  const total =
    net > 0
      ? L(`Kul baqi (aap ke zimme): ${m(net)}`, `Total you owe me: ${m(net)}`)
      : net < 0
        ? L(`Kul baqi (mere zimme): ${m(net)}`, `Total I owe you: ${m(net)}`)
        : L('Kuch baqi nahi — hisaab barabar hai.', 'Nothing outstanding — we are all square.');

  const greeting = ur ? `Assalam o Alaikum ${name},\nAap ke hisaab ki tafseel (${format(new Date(), 'd MMM yyyy')} tak):` : `Hi ${name},\nHere is the statement of our account as of ${format(new Date(), 'd MMM yyyy')}:`;
  const rule = '──────────────────────────';
  const closing = ur ? 'Koi farq ho to bata dein. Shukriya!' : 'Let me know if anything looks different. Thank you!';
  return [greeting, '', blocks.join('\n\n'), '', rule, total, '', closing + (ownerName ? `\n— ${ownerName}` : '')].join('\n');
}
