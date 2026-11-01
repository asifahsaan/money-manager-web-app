import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, FileText, Loader2, Mail, MessageCircle, UserPlus, X } from 'lucide-react';
import type { Debt, Wallet } from '@/types';
import { debtService } from '@/services/debt.service';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { mailtoUrl, whatsappUrl, type ReminderLanguage } from '@/lib/debt-reminders';
import { debtsOfPerson, personKey, similarNames, statementSubject, statementText } from '@/lib/debt-statement';

const LANG_KEY = 'mm_reminder_lang';
const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface Props {
  personName: string;
  allDebts: Debt[];
  wallets: Wallet[];
  currency: string;
  onClose: () => void;
}

/**
 * One message with everything between the user and a person: all their
 * loans (both directions), every payment, and the net balance. Sent from the
 * user's own email or WhatsApp — the user presses Send.
 */
export function DebtStatementModal({ personName, allDebts, wallets, currency, onClose }: Props) {
  const qc = useQueryClient();
  const ownerName = useAuthStore((s) => s.user?.name ?? '');
  const [lang, setLang] = useState<ReminderLanguage>(() => {
    try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ur'; } catch { return 'ur'; }
  });
  const [includeSettled, setIncludeSettled] = useState(false);
  const [extraNames, setExtraNames] = useState<string[]>([]);

  const base = useMemo(() => debtsOfPerson(allDebts, personName), [allDebts, personName]);
  const extra = useMemo(
    () => allDebts.filter((d) => extraNames.some((n) => personKey(n) === personKey(d.personName)) && !base.some((b) => b.id === d.id)),
    [allDebts, extraNames, base],
  );
  const chosen = [...base, ...extra].filter((d) => includeSettled || d.status !== 'CLOSED');
  const suggestions = similarNames(allDebts, personName, new Set([...base, ...extra].map((d) => d.id))).filter(
    (n) => !extraNames.includes(n),
  );
  const settledCount = [...base, ...extra].filter((d) => d.status === 'CLOSED').length;

  // The debts list carries only the latest few payments — load each debt in full
  const full = useQueries({
    queries: chosen.map((d) => ({ queryKey: ['debts', 'one', d.id], queryFn: () => debtService.getOne(d.id), staleTime: 60_000 })),
  });
  const loading = full.some((q) => q.isLoading);
  const loaded = full.map((q, i) => q.data ?? chosen[i]);

  const savedEmail = [...base, ...extra].find((d) => d.contactEmail)?.contactEmail ?? '';
  const savedPhone = [...base, ...extra].find((d) => d.contactPhone)?.contactPhone ?? '';
  const [email, setEmail] = useState(savedEmail);
  const [saveEmail, setSaveEmail] = useState(false);

  const walletName = (id: number | null) => (id ? wallets.find((w) => w.id === id)?.name : undefined);
  const generated = loading ? '' : statementText({ personName, debts: loaded, walletName, lang, ownerName, currency });
  // Regenerated when the options change; the user may still edit it before sending
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited && generated) setText(generated);
  }, [generated, edited]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchLang = (l: ReminderLanguage) => {
    setLang(l);
    setEdited(false);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  };

  const emailOk = EMAIL_RE.test(email.trim());

  async function rememberEmail() {
    if (!saveEmail || !emailOk || email.trim() === savedEmail) return;
    try {
      await Promise.all(chosen.map((d) => debtService.update(d.id, { contactEmail: email.trim() })));
      qc.invalidateQueries({ queryKey: ['debts'] });
      toast.success(`Email saved for ${personName}`);
    } catch {
      toast.error('Could not save the email');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy — select the text and copy it');
    }
  }

  const btn = 'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90';
  const noDebts = !loading && chosen.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Send statement" className="relative flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <FileText size={17} className="text-primary-600" /> Statement for {personName.trim()}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {chosen.length} loan{chosen.length === 1 ? '' : 's'} in one message · opens your email or WhatsApp — you press Send.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-gray-100"><X size={18} className="text-ink-muted" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {/* Send to */}
          <div>
            <label htmlFor="stmt-email" className="mb-1 block text-xs font-medium text-ink-muted">Send to (email)</label>
            <input
              id="stmt-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className={cn('h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink focus:outline-none', email && !emailOk ? 'border-expense' : 'border-line focus:border-primary-500')}
            />
            {email.trim() !== savedEmail && emailOk && (
              <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-ink">
                <input type="checkbox" checked={saveEmail} onChange={(e) => setSaveEmail(e.target.checked)} className="accent-primary-600" />
                Save this email for {personName.trim()}
              </label>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label="Language">
              {([['ur', 'Roman Urdu'], ['en', 'English']] as const).map(([l, label]) => (
                <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => switchLang(l)}
                  className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors', lang === l ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}>
                  {label}
                </button>
              ))}
            </div>
            {settledCount > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                <input type="checkbox" checked={includeSettled} onChange={(e) => { setIncludeSettled(e.target.checked); setEdited(false); }} className="accent-primary-600" />
                Include {settledCount} settled
              </label>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-ink">
              <p className="mb-1 text-ink-muted">Same person under another name?</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((n) => (
                  <button key={n} type="button" onClick={() => { setExtraNames((x) => [...x, n]); setEdited(false); }}
                    className="flex items-center gap-1 rounded-md bg-surface px-2 py-1 font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-100">
                    <UserPlus size={12} /> Add “{n}”
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-ink-muted"><Loader2 size={16} className="mr-2 animate-spin" /> Loading every payment…</div>
          ) : noDebts ? (
            <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-sm text-ink-muted">Nothing open with {personName.trim()} — tick “Include settled” to send the full history.</p>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setEdited(true); }}
                rows={12}
                aria-label="Statement"
                className="w-full resize-y rounded-lg border border-line bg-surface p-3 font-mono text-[12.5px] leading-relaxed text-ink focus:border-primary-500 focus:outline-none"
              />
              {edited && (
                <button type="button" onClick={() => setEdited(false)} className="-mt-1 text-xs font-medium text-primary-600 hover:underline">Undo my edits</button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={copy} disabled={!text} className={cn(btn, 'max-w-[110px] border border-line bg-surface text-ink disabled:opacity-50')}>
            <Copy size={15} /> Copy
          </button>
          <a
            href={emailOk && text ? mailtoUrl(email.trim(), statementSubject(personName, lang), text) : undefined}
            onClick={(e) => {
              if (!emailOk || !text) { e.preventDefault(); toast.error(text ? 'Enter a valid email first' : 'Nothing to send yet'); return; }
              void rememberEmail();
            }}
            aria-disabled={!emailOk || !text}
            className={cn(btn, 'text-white', (!emailOk || !text) && 'opacity-50')}
            style={{ background: 'rgb(var(--c-brand-600))' }}
          >
            <Mail size={16} /> Email
          </a>
          <a
            href={text ? whatsappUrl(savedPhone, text) : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => { if (!text) e.preventDefault(); }}
            className={cn(btn, 'text-white', !text && 'opacity-50')}
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
