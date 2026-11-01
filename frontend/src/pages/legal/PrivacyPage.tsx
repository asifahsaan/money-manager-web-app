import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: 'What is stored',
    points: [
      'Your name, email and password. The password is stored as a one-way hash, so nobody can read it.',
      'What you enter: wallets, transactions, budgets, goals, debts and the names, emails or phone numbers you add to them.',
      'When you last used the app.',
    ],
  },
  {
    title: 'Where it is stored',
    points: [
      'Your data is in a Neon Postgres database. The server runs on Render and the website on Vercel.',
    ],
  },
  {
    title: 'Who can see it',
    points: [
      'Other users cannot see your data.',
      'App admins can see your name, email, sign-up date, last active time, wallets, number of transactions and income and expense totals.',
      'The person who runs this app has access to the database itself, so avoid storing anything you would not want them to be able to see.',
    ],
  },
  {
    title: 'How it is used',
    points: [
      'Only to run the app for you. There are no ads, and your data is not sold.',
      'A debt statement goes out only when you send it yourself from your own email or WhatsApp.',
    ],
  },
  {
    title: 'Your choices',
    points: [
      'You can edit or delete your entries at any time.',
      'To remove your account and everything in it, ask the person who runs this app.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline">
          <ArrowLeft size={15} /> Money Manager
        </Link>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Privacy</h1>
        <p className="mt-1 text-sm text-ink-muted">What happens to your data, in plain words.</p>
        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-semibold text-ink">{s.title}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
