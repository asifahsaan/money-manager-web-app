import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Debt } from '@/types';
import { formatCurrency } from '@/lib/utils';

export type ReminderLanguage = 'ur' | 'en';

// ─── Due status ───────────────────────────────────────────────────────────────

export type DueKind = 'overdue' | 'today' | 'soon' | 'later' | 'none';
export const DUE_SOON_DAYS = 3;

export function dueStatus(debt: Pick<Debt, 'dueDate' | 'status'>, today = new Date()): { kind: DueKind; days: number } {
  if (!debt.dueDate || debt.status === 'CLOSED') return { kind: 'none', days: 0 };
  const days = differenceInCalendarDays(parseISO(debt.dueDate.slice(0, 10)), today);
  if (days < 0) return { kind: 'overdue', days: -days };
  if (days === 0) return { kind: 'today', days: 0 };
  if (days <= DUE_SOON_DAYS) return { kind: 'soon', days };
  return { kind: 'later', days };
}

export function dueLabel(debt: Pick<Debt, 'dueDate' | 'status'>): string | null {
  const { kind, days } = dueStatus(debt);
  if (kind === 'none') return null;
  if (kind === 'overdue') return `Overdue ${days}d`;
  if (kind === 'today') return 'Due today';
  if (kind === 'soon') return `Due in ${days}d`;
  return `Due ${format(parseISO(debt.dueDate!.slice(0, 10)), 'd MMM')}`;
}

/** Open debts that are overdue or due within DUE_SOON_DAYS, most urgent first. */
export function urgentDebts(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => ['overdue', 'today', 'soon'].includes(dueStatus(d).kind))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
}

// ─── Message templates ────────────────────────────────────────────────────────

const day = (iso: string) => format(parseISO(iso.slice(0, 10)), 'd MMM yyyy');

// Wording is gender-neutral on purpose: it's sent in the user's name.
export function reminderMessage(debt: Debt, lang: ReminderLanguage, ownerName: string, currency: string): string {
  const m = (v: string | number) => formatCurrency(Number(v), currency).replace(' ', ' ');
  const total = m(debt.totalAmount);
  const remaining = m(debt.remainingAmount);
  const settled = Number(debt.settledAmount);
  const lentOn = day(debt.date);
  const due = debt.dueDate ? day(debt.dueDate) : null;
  const desc = debt.description?.trim();
  const sign = ownerName ? `\n— ${ownerName}` : '';
  const owedToMe = debt.type === 'RECEIVABLE';

  if (lang === 'ur') {
    if (owedToMe) {
      return (
        `Assalam o Alaikum ${debt.personName},\n` +
        `Ye ek yaad dehani hai: ${lentOn} ko ${desc ? `${desc} ke liye ` : ''}aap ko ${total} diye the.` +
        (settled > 0 ? ` ${m(settled)} wapas mil chuke hain,` : '') +
        ` ${remaining} baqi hain.` +
        (due ? ` Wapsi ki tareekh: ${due}.` : '') +
        `\nShukriya!${sign}`
      );
    }
    return (
      `Assalam o Alaikum ${debt.personName},\n` +
      `${lentOn} ko ${desc ? `${desc} ke liye ` : ''}aap se ${total} liye the.` +
      (settled > 0 ? ` Ab tak ${m(settled)} wapas ho chuke hain.` : '') +
      ` Baqi ${remaining} ${due ? `${due} tak` : 'jald'} wapas kar diye jayenge.` +
      `\nShukriya!${sign}`
    );
  }

  if (owedToMe) {
    return (
      `Hi ${debt.personName},\n` +
      `A friendly reminder: on ${lentOn} I lent you ${total}${desc ? ` for ${desc}` : ''}.` +
      (settled > 0 ? ` ${m(settled)} has been paid back so far,` : '') +
      ` ${remaining} is still outstanding.` +
      (due ? ` Due date: ${due}.` : '') +
      `\nThank you!${sign}`
    );
  }
  return (
    `Hi ${debt.personName},\n` +
    `Just confirming: on ${lentOn} I borrowed ${total} from you${desc ? ` for ${desc}` : ''}.` +
    (settled > 0 ? ` ${m(settled)} has been repaid so far.` : '') +
    ` The remaining ${remaining} will be returned ${due ? `by ${due}` : 'soon'}.` +
    `\nThanks!${sign}`
  );
}

export function reminderSubject(debt: Debt, lang: ReminderLanguage): string {
  if (lang === 'ur') return debt.type === 'RECEIVABLE' ? 'Yaad dehani — raqam ki wapsi' : 'Raqam ki wapsi ke bare mein';
  return debt.type === 'RECEIVABLE' ? 'Friendly reminder — payment due' : 'About the money I borrowed';
}

// ─── Links (the user presses Send themselves — nothing is sent automatically) ─

/** "0300-1234567" → "923001234567" (Pakistan default); keeps other country codes. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d.length >= 8 ? d : null;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const n = whatsappNumber(phone);
  return `https://wa.me/${n ?? ''}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
