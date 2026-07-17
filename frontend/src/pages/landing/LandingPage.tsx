import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  TrendingUp, Wallet, ArrowLeftRight, PieChart, Target, HandCoins,
  RefreshCw, ShieldCheck, Menu, X, Mail, ChevronDown, ChevronUp,
  UserPlus, FolderPlus, LineChart, CheckCircle2, Github, Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

const GRADIENT = 'linear-gradient(135deg, #fbbf24, #f97316)';

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

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Logged-in users go straight to the app
  if (user) return <Navigate to="/transactions" replace />;

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#why-us', label: 'Why us' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-orange-50/40 text-gray-800">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-amber-100/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: GRADIENT }}>
              <TrendingUp size={18} color="white" />
            </div>
            <div className="leading-tight">
              <p className="font-black text-sm text-gray-900">Money Manager</p>
              <p className="text-[10px] text-gray-400 -mt-0.5">Personal Finance</p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-xs font-semibold text-gray-500 hover:text-amber-600 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Auth buttons — top right */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 shadow-md active:scale-95 transition-all"
              style={{ background: GRADIENT }}>
              Register Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-amber-50" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-amber-100 px-4 py-3 space-y-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-amber-50">
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100">Login</Link>
              <Link to="/register" className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-amber-900" style={{ background: GRADIENT }}>
                Register Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold text-amber-800 bg-amber-100/80 mb-5">
          ✨ Free personal finance app — built for everyday life
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 max-w-3xl mx-auto">
          Take control of{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
            every rupee
          </span>{' '}
          you earn & spend
        </h1>
        <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto mt-5 leading-relaxed">
          Money Manager brings your wallets, expenses, budgets, goals, and debts together in one
          beautiful dashboard — so you always know exactly where your money is and where it went.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link to="/register"
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-amber-900 shadow-lg active:scale-95 transition-all"
            style={{ background: GRADIENT, boxShadow: '0 12px 30px rgba(217,119,6,0.3)' }}>
            Get Started — It's Free
          </Link>
          <a href="#features"
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:border-amber-300 hover:text-amber-700 transition-colors">
            Explore Features
          </a>
        </div>

        {/* Stat highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mt-14">
          {[
            ['8+', 'Core features'],
            ['∞', 'Wallets & categories'],
            ['100%', 'Free forever'],
            ['24/7', 'Access anywhere'],
          ].map(([num, label]) => (
            <div key={label} className="bg-white/70 backdrop-blur rounded-2xl border border-amber-100/60 p-4 shadow-sm">
              <p className="text-2xl font-black text-transparent bg-clip-text" style={{ backgroundImage: GRADIENT }}>{num}</p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">Features</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Everything your money needs</h2>
          <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">
            From daily chai expenses to salary, lending, and long-term goals — one app handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-md" style={{ background: GRADIENT }}>
                <f.icon size={19} color="white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-gradient-to-b from-white to-amber-50/50 py-16 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Up and running in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                <span className="absolute top-4 right-5 text-4xl font-black text-amber-100 select-none">{s.step}</span>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md" style={{ background: GRADIENT }}>
                  <s.icon size={20} color="white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section id="why-us" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">Why choose us</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              Made with care,<br />built for real life
            </h2>
            <p className="text-sm text-gray-500 mt-4 leading-relaxed">
              Most finance apps are bloated, paid, or built for other markets. Money Manager is
              designed around how people here actually manage money — cash plus banks plus e-wallets,
              lending between friends and family, and monthly budgets that matter.
            </p>
            <Link to="/register" className="inline-block mt-6 px-6 py-3 rounded-2xl font-bold text-sm text-amber-900 shadow-lg active:scale-95 transition-all"
              style={{ background: GRADIENT }}>
              Start Tracking Today
            </Link>
          </div>
          <div className="space-y-3">
            {WHY_US.map((point) => (
              <div key={point} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-gradient-to-b from-white to-amber-50/50 py-16 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-sm font-bold text-gray-800">{f.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} className="text-amber-500 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-4 text-xs text-gray-500 leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="rounded-3xl p-8 sm:p-12 text-center shadow-xl" style={{ background: GRADIENT }}>
          <Mail size={32} className="mx-auto mb-4 text-amber-900" />
          <h2 className="text-2xl sm:text-3xl font-black text-amber-950">Have a question or feedback?</h2>
          <p className="text-sm text-amber-900/80 mt-2 max-w-md mx-auto">
            We'd love to hear from you — feature requests, bug reports, or just to say salam.
          </p>
          <a href="mailto:asifahsaan1@gmail.com?subject=Money%20Manager%20—%20Contact"
            className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-2xl font-bold text-sm bg-white text-amber-700 shadow-lg hover:shadow-xl active:scale-95 transition-all">
            <Mail size={16} /> asifahsaan1@gmail.com
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: GRADIENT }}>
                <TrendingUp size={18} color="white" />
              </div>
              <div className="leading-tight">
                <p className="font-black text-sm text-white">Money Manager</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">Personal Finance</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              A free, modern personal finance app to track wallets, expenses, budgets, goals,
              and debts — designed and built with care to help you master your money.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Links</p>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-xs text-gray-400 hover:text-amber-400 transition-colors">{l.label}</a>
                </li>
              ))}
              <li><Link to="/login" className="text-xs text-gray-400 hover:text-amber-400 transition-colors">Login</Link></li>
              <li><Link to="/register" className="text-xs text-gray-400 hover:text-amber-400 transition-colors">Register</Link></li>
            </ul>
          </div>

          {/* Contact / owner */}
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Get in Touch</p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-xs text-gray-400">
                <Mail size={13} className="text-amber-400 flex-shrink-0" />
                <a href="mailto:asifahsaan1@gmail.com" className="hover:text-amber-400 transition-colors">asifahsaan1@gmail.com</a>
              </li>
              <li className="flex items-center gap-2 text-xs text-gray-400">
                <Github size={13} className="text-amber-400 flex-shrink-0" />
                <a href="https://github.com/asifahsaan" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">
                  github.com/asifahsaan
                </a>
              </li>
              <li className="text-xs text-gray-400 pt-1">
                <span className="text-gray-500">Owner & Creator:</span><br />
                <span className="font-bold text-white">Asif Ahsaan</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500">
              © {new Date().getFullYear()} Money Manager. All rights reserved.
            </p>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              Crafted with <Heart size={11} className="text-red-500 fill-red-500" /> by <span className="font-semibold text-gray-300">Asif Ahsaan</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
