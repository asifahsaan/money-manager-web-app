import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MessageCircle, X } from 'lucide-react';
import type { Debt } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import {
  mailtoUrl, reminderMessage, reminderSubject, whatsappNumber, whatsappUrl, type ReminderLanguage,
} from '@/lib/debt-reminders';

const LANG_KEY = 'mm_reminder_lang';

interface Props {
  debt: Debt;
  currency: string;
  onClose: () => void;
  /** Shown right after a debt is created */
  title?: string;
}

// Composes a WhatsApp / email message about a debt. Opens the user's own
// WhatsApp or mail app with the text filled in — the user presses Send.
export function DebtReminderModal({ debt, currency, onClose, title }: Props) {
  const ownerName = useAuthStore((s) => s.user?.name ?? '');
  const [lang, setLang] = useState<ReminderLanguage>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ur';
    } catch {
      return 'ur';
    }
  });
  const [text, setText] = useState(() => reminderMessage(debt, lang, ownerName, currency));

  const switchLang = (l: ReminderLanguage) => {
    setLang(l);
    setText(reminderMessage(debt, l, ownerName, currency));
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasPhone = !!whatsappNumber(debt.contactPhone);
  const btn = 'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Send reminder" className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title ?? `Message ${debt.personName}`}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Opens your WhatsApp or email app with this text — you press Send.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <div className="inline-flex rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label="Language">
            {([['ur', 'Roman Urdu'], ['en', 'English']] as const).map(([l, label]) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => switchLang(l)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  lang === l ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            aria-label="Message"
            className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-ink focus:border-primary-500 focus:outline-none"
          />
          <p className="text-xs text-ink-muted">
            {hasPhone ? `WhatsApp: ${debt.contactPhone}` : 'No phone saved — WhatsApp will ask you to pick a contact.'}
            {' · '}
            {debt.contactEmail ? `Email: ${debt.contactEmail}` : 'No email saved.'}
          </p>
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <a
            href={mailtoUrl(debt.contactEmail, reminderSubject(debt, lang), text)}
            className={cn(btn, 'border border-line bg-surface text-ink')}
          >
            <Mail size={16} /> Email
          </a>
          <a
            href={whatsappUrl(debt.contactPhone, text)}
            target="_blank"
            rel="noreferrer"
            className={cn(btn, 'text-white')}
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
