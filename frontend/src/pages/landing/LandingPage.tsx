import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  TrendingUp, Wallet, ArrowLeftRight, PieChart, Target, HandCoins,
  RefreshCw, ShieldCheck, Menu, X, Mail, ChevronDown, ChevronUp,
  UserPlus, FolderPlus, LineChart, CheckCircle2, Github, Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// Fixed hex (not theme tokens) so the brand gradient looks the same in light and dark mode.
const GRADIENT = 'linear-gradient(135deg, #6366f1, #7c3aed)';

const FEATURES = [
  { icon: Wallet, title: 'Multi-Wallet Management', desc: 'Track bank accounts, cash, and e-wallets separately — Alfala, Meezan, Jazzcash, or any wallet you use — with live balances.' },
  { icon: ArrowLeftRight, title: 'Smart Transactions', desc: 'Record income, expenses, and transfers with categories, attachments, and search. Everything grouped by date.' },
  { icon: PieChart, title: 'Powerful Statistics', desc: 'Interactive donut charts, weekly spending, income vs expense trends, and category breakdowns for any period.' },
  { icon: Target, title: 'Budgets & Goals', desc: 'Set monthly budgets per category and savings goals. Watch progress bars keep you accountable.' },
  { icon: HandCoins, title: 'Debt Tracker', desc: 'Track money you lent or borrowed, record collections and payments per wallet, and see settlement progress.' },
  { icon: RefreshCw, title: 'Recurring Transactions', desc: 'Salary, bills, subscriptions — set them once and let the app handle repeats.' },
  { icon: LineChart, title: 'Calendar View', desc: 'See your daily spending at a glance in a monthly calendar layout.' },
  { icon: ShieldCheck, title: 'Private & Secure', desc: 'JWT authentication with encrypted passwords. Your financial data belongs to you alone.' },
];

const STEPS = [
  { icon: UserPlus, step: '01', title: 'Create your free account', desc: 'Register with just your name and email — no credit card, no fees, ready in under a minute.' },
  { icon: FolderPlus, step: '02', title: 'Add your wallets', desc: 'Add your bank accounts, cash, and e-wallets with opening balances to mirror your real finances.' },
  { icon: LineChart, step: '03', title: 'Track & grow', desc: 'Log transactions, set budgets, follow statistics — and take control of where your money goes.' },
];

const WHY_US = [
  '100% free — no subscriptions, no hidden charges',
  'Built for Pakistan — full PKR (Rs.) support',
  'Real-time wallet balances that always add up',
  'Debt & lending tracker made for real life',
  'Clean, fast, modern interface on any device',
  'Secure JWT login with bcrypt-encrypted passwords',
];

const FAQS = [
  { q: 'Is Money Manager really free?', a: 'Yes — completely free. Create an account and use every feature: wallets, budgets, goals, debts, statistics, and more, without paying anything.' },
  { q: 'Is my financial data safe?', a: 'Your account is protected with JWT authentication and your password is stored encrypted using bcrypt. Only you can access your data after logging in.' },
  { q: 'Can I track money I lent to friends?', a: 'Absolutely. The Debt Tracker lets you record receivables (money owed to you) and payables (money you owe), link them to wallets, and track collections until fully settled.' },
  { q: 'Does it support multiple wallets or banks?', a: 'Yes. Add unlimited wallets — bank accounts, cash, e-wallets like Jazzcash — each with its own balance, and transfer between them.' },
  { q: 'Can I see where my money goes each month?', a: 'The Statistics page gives you donut charts by category, weekly spending patterns, top expenses, and income vs expense trends across months.' },
];

const EYEBROW = 'mb-2 text-xs font-semibold uppercase tracking-widest text-primary-600';
const H2 = 'text-3xl font-bold tracking-tight text-ink sm:text-4xl';
const CARD = 'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)]';
// Tinted band that separates sections: lavender in light mode, deep indigo in dark
const BAND = 'border-y border-line bg-primary-50/60';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Logged-in users go straight to the app
  if (user) return <Navigate to="/overview" replace />;

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#why-us', label: 'Why us' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md" style={{ background: GRADIENT }}>
              <TrendingUp size={18} color="white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-ink">Money Manager</p>
              <p className="-mt-0.5 text-[11px] text-ink-muted">Personal Finance</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-ink-muted transition-colors hover:text-primary-600">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gray-100">
              Login
            </Link>
            <Link to="/register" className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-all active:scale-95"
              style={{ background: GRADIENT }}>
              Register Free
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button className="rounded-lg p-2 text-ink hover:bg-gray-100" aria-label="Menu" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="space-y-1 border-t border-line bg-surface px-4 py-3 md:hidden">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-gray-100">
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-center text-sm font-semibold text-ink">Login</Link>
              <Link to="/register" className="flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white" style={{ background: GRADIENT }}>
                Register Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-canvas">
        <div
          className="pointer-events-none absolute inset-x-0 -top-48 h-[520px] opacity-40 blur-3xl dark:opacity-25"
          style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 60%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6">
          <span className="mb-5 inline-block rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700">
            ✨ Free personal finance app — built for everyday life
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Take control of{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
              every rupee
            </span>{' '}
            you earn & spend
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Money Manager brings your wallets, expenses, budgets, goals, and debts together in one
            beautiful dashboard — so you always know exactly where your money is and where it went.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register"
              className="rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: GRADIENT, boxShadow: '0 12px 30px rgba(79,70,229,0.3)' }}>
              Get Started — It's Free
            </Link>
            <a href="#features"
              className="rounded-xl border border-line bg-surface px-8 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-primary-300 hover:text-primary-600">
              Explore Features
            </a>
          </div>

          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['8+', 'Core features'],
              ['∞', 'Wallets & categories'],
              ['100%', 'Free forever'],
              ['24/7', 'Access anywhere'],
            ].map(([num, label]) => (
              <div key={label} className={`${CARD} bg-surface/90 p-4`}>
                <p className="bg-clip-text text-2xl font-extrabold text-transparent" style={{ backgroundImage: GRADIENT }}>{num}</p>
                <p className="mt-0.5 text-xs font-medium text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={`scroll-mt-20 py-20 ${BAND}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className={EYEBROW}>Features</p>
            <h2 className={H2}>Everything your money needs</h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-ink-muted">
              From daily chai expenses to salary, lending, and long-term goals — one app handles it all.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`${CARD} p-5 transition-all hover:-translate-y-1 hover:shadow-lg`}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl shadow-md" style={{ background: GRADIENT }}>
                  <f.icon size={19} color="white" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-ink">{f.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className={EYEBROW}>How it works</p>
            <h2 className={H2}>Up and running in 3 steps</h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className={`relative ${CARD} p-6 text-center`}>
                <span className="absolute right-5 top-4 select-none text-4xl font-extrabold text-primary-200">{s.step}</span>
                <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md" style={{ background: GRADIENT }}>
                  <s.icon size={20} color="white" />
                </div>
                <h3 className="relative mb-2 text-base font-semibold text-ink">{s.title}</h3>
                <p className="relative text-sm leading-relaxed text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section id="why-us" className={`scroll-mt-20 py-20 ${BAND}`}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className={EYEBROW}>Why choose us</p>
            <h2 className={`${H2} leading-tight`}>
              Made with care,<br />built for real life
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Most finance apps are bloated, paid, or built for other markets. Money Manager is
              designed around how people here actually manage money — cash plus banks plus e-wallets,
              lending between friends and family, and monthly budgets that matter.
            </p>
            <Link to="/register" className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
              style={{ background: GRADIENT }}>
              Start Tracking Today
            </Link>
          </div>
          <div className="space-y-3">
            {WHY_US.map((point) => (
              <div key={point} className={`flex items-center gap-3 px-4 py-3 ${CARD} rounded-xl`}>
                <CheckCircle2 size={18} className="flex-shrink-0 text-primary-600" />
                <p className="text-sm font-medium text-ink">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className={EYEBROW}>FAQ</p>
            <h2 className={H2}>Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`${CARD} overflow-hidden`}>
                <button
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-base font-semibold text-ink">{f.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={18} className="flex-shrink-0 text-primary-600" />
                    : <ChevronDown size={18} className="flex-shrink-0 text-ink-muted" />}
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <div className="rounded-3xl p-8 text-center shadow-xl sm:p-12" style={{ background: GRADIENT }}>
          <Mail size={32} className="mx-auto mb-4 text-white" />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Have a question or feedback?</h2>
          <p className="mx-auto mt-2 max-w-md text-base text-white/85">
            We'd love to hear from you — feature requests, bug reports, or just to say salam.
          </p>
          <a
            href="mailto:asifahsaan1@gmail.com?subject=Money%20Manager%20—%20Contact"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold shadow-lg transition-all hover:shadow-xl active:scale-95"
            style={{ background: '#ffffff', color: '#4338ca' }}
          >
            <Mail size={16} /> asifahsaan1@gmail.com
          </a>
        </div>
      </section>

      {/* ── Footer — always dark, so fixed colors instead of theme tokens ── */}
      <footer style={{ background: '#0b1020' }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: GRADIENT }}>
                <TrendingUp size={18} color="white" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">Money Manager</p>
                <p className="-mt-0.5 text-[11px] text-white/60">Personal Finance</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/65">
              A free, modern personal finance app to track wallets, expenses, budgets, goals,
              and debts — designed and built with care to help you master your money.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Quick Links</p>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-white/65 transition-colors hover:text-white">{l.label}</a>
                </li>
              ))}
              <li><Link to="/login" className="text-sm text-white/65 transition-colors hover:text-white">Login</Link></li>
              <li><Link to="/register" className="text-sm text-white/65 transition-colors hover:text-white">Register</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Get in Touch</p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-white/65">
                <Mail size={14} className="flex-shrink-0" color="#a5b4fc" />
                <a href="mailto:asifahsaan1@gmail.com" className="transition-colors hover:text-white">asifahsaan1@gmail.com</a>
              </li>
              <li className="flex items-center gap-2 text-sm text-white/65">
                <Github size={14} className="flex-shrink-0" color="#a5b4fc" />
                <a href="https://github.com/asifahsaan" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                  github.com/asifahsaan
                </a>
              </li>
              <li className="pt-1 text-sm text-white/65">
                <span className="text-white/50">Owner & Creator:</span>
                <br />
                <span className="font-semibold text-white">Asif Ahsaan</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6">
            <p className="text-xs text-white/50">© {new Date().getFullYear()} Money Manager. All rights reserved.</p>
            <p className="flex items-center gap-1 text-xs text-white/50">
              Crafted with <Heart size={11} color="#f43f5e" fill="#f43f5e" /> by{' '}
              <span className="font-semibold text-white/80">Asif Ahsaan</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
