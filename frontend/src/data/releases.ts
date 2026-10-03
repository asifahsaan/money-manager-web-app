// Release notes shown in the "What's New" panel (newest first).
//
// Every release: add a new entry at the TOP of this list and bump
// `version` in frontend/package.json to match. Write for users, not
// developers — what they can now do, what got better, what was fixed.

export type ChangeKind = 'new' | 'improved' | 'fixed' | 'security';

export interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const RELEASES: Release[] = [
  {
    version: '1.12.0',
    date: '2026-10-03',
    title: 'A tighter layout & a new calendar',
    changes: [
      { kind: 'new', text: 'Calendar redesigned — the selected day’s transactions sit beside the month, days you spent more are shaded darker, each week shows its total, and you can jump to any month or back to today.' },
      { kind: 'new', text: 'Hide amounts on the Calendar too, including the amounts inside each day.' },
      { kind: 'improved', text: 'After “Hide all”, tap the eye on any single card to show just that one — no need to reveal everything.' },
      { kind: 'new', text: 'Budgets, Goals and Recurring each get a summary row — total limit and what’s left, how much you’ve saved, monthly bills and what’s due now.' },
      { kind: 'improved', text: 'Budgets show how far over you are (e.g. 160%), days left and how much you can spend per day.' },
      { kind: 'improved', text: 'Goals show days left and how much to save each month to reach them.' },
      { kind: 'improved', text: 'Recurring is now a compact list sorted by what’s due next, with Run and Delete on each row.' },
      { kind: 'improved', text: 'Tabs in Wallets & Plans show counts, and turn red when a budget is over or a debt is overdue.' },
      { kind: 'improved', text: 'Cards that sit side by side are the same height; long lists scroll inside the card instead of stretching the page.' },
      { kind: 'improved', text: 'Statistics: biggest expenses (top 10), the weekday you spend most on, and percentages to two decimals.' },
      { kind: 'fixed', text: 'Statistics now shows the right opening and closing balance for past months.' },
      { kind: 'improved', text: 'Wallet lists on Overview and Transactions use each bank’s colours and badge.' },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-02',
    title: 'Bank-themed wallets & a better debt tracker',
    changes: [
      { kind: 'new', text: 'Debts: totals at the top — how much you will receive, how much you owe, your net position and what is due soon.' },
      { kind: 'new', text: 'Debts: one list with All / To receive / To pay / Settled filters, search, sorting and pages of 10.' },
      { kind: 'new', text: 'Debt activity log — every loan, repayment and collection by date, filterable by type, person and dates, with CSV download.' },
      { kind: 'new', text: 'History button on each debt shows that person’s full record.' },
      { kind: 'new', text: 'Wallet cards now look like your bank or wallet — Meezan, Alfalah, HBL, UBL, MCB, JazzCash, Easypaisa and 17 more get their own colours and badge.' },
      { kind: 'new', text: 'Detected from the wallet name automatically; pick a different bank or a plain colour in Edit wallet, with a live preview.' },
      { kind: 'improved', text: 'Smaller wallet cards — up to four in a row on wide screens, so you see all your wallets at once.' },
      { kind: 'fixed', text: 'You are no longer logged out by surprise when the server is slow to respond — the app simply tries again.' },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-30',
    title: 'Tax Year Report & audit',
    changes: [
      { kind: 'new', text: 'Tax Report — one click builds your income by head, personal expenses and wealth reconciliation for a Pakistan tax year (Jul–Jun) or a calendar year.' },
      { kind: 'new', text: 'Data audit finds uncategorised entries, possible duplicates, wallet mismatches, negative balances, large expenses without receipts and old loans — tap any item to fix it.' },
      { kind: 'new', text: 'Each head shows the related Income Tax Ordinance, 2001 section (e.g. s.12 salary, s.116 wealth statement) for reference.' },
      { kind: 'new', text: 'Download the full report as PDF (for your tax consultant) or CSV.' },
      { kind: 'new', text: 'Choose which head each category belongs to; your choice is saved.' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-30',
    title: 'Debt reminders',
    changes: [
      { kind: 'new', text: 'Add a "pay back by" date, phone and email to any debt.' },
      { kind: 'new', text: 'Send a ready-made reminder on WhatsApp or email in one tap — in Roman Urdu or English, and you can edit it first.' },
      { kind: 'new', text: 'After adding a debt, send the person a note about it right away.' },
      { kind: 'new', text: 'The bell in the header and a "Debts due" card on Overview show what is overdue or due soon.' },
      { kind: 'fixed', text: 'Buttons in Budgets, Goals, Debts and Recurring are readable again (white text).' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-09-29',
    title: 'Statements & faster entry',
    changes: [
      { kind: 'new', text: 'Statements — a monthly (or custom-dates) ledger with opening balance, every debit and credit, running balance and closing balance.' },
      { kind: 'new', text: 'Download your statement as a PDF or a CSV (opens in Excel).' },
      { kind: 'new', text: 'Pick one wallet or all wallets together. Open it from the sidebar or the statement button on Transactions.' },
      { kind: 'improved', text: 'A compact add-transaction form that fits on one screen — Save is always visible.' },
      { kind: 'new', text: 'One-tap category chips showing the categories you use most; everything else under "More".' },
      { kind: 'new', text: '"Save & add another" for entering several expenses in a row.' },
      { kind: 'improved', text: 'Remembers the wallet you used last; swap From/To in one tap on transfers.' },
      { kind: 'fixed', text: 'Editing a transaction now shows its category instead of an empty picker.' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-09-26',
    title: 'A fresh new look',
    changes: [
      { kind: 'new', text: 'Overview — your net worth, monthly cash flow, budgets, goals and recent activity on one screen.' },
      { kind: 'new', text: 'Dark mode. Switch with the sun/moon button, or let it follow your phone.' },
      { kind: 'new', text: 'Add a transaction from any screen with the "Add transaction" button.' },
      { kind: 'new', text: 'Tap any recent transaction on Overview to view or edit it in a pop-up.' },
      { kind: 'new', text: 'Tap a spending category to see its breakdown and every transaction in it.' },
      { kind: 'new', text: 'Switch the cash-flow chart between bars and a line graph.' },
      { kind: 'new', text: '"Hide all" on Overview hides your balances, with an eye icon on each card.' },
      { kind: 'improved', text: 'Completely redesigned with a cleaner, calmer look and easier-to-read colors.' },
      { kind: 'improved', text: 'Income is green and expenses are red everywhere, so amounts read at a glance.' },
      { kind: 'improved', text: 'The app loads faster — screens now load only when you open them.' },
      { kind: 'fixed', text: 'Category icons show correctly again (they were all showing a tag).' },
      { kind: 'fixed', text: 'Statistics, calendar and budgets refresh right after you add or edit a transaction.' },
      { kind: 'fixed', text: 'Amounts no longer split "Rs." onto a separate line.' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-09-26',
    title: 'Safer accounts & smarter search',
    changes: [
      { kind: 'new', text: "What's New — see every update to the app right here." },
      { kind: 'security', text: 'Stronger protection so no one else can ever touch your wallets, categories or balances.' },
      { kind: 'security', text: 'Repeated wrong-password attempts are now temporarily blocked to protect your account.' },
      { kind: 'fixed', text: 'Search ignores capital letters again — "food" also finds "Food".' },
      { kind: 'fixed', text: 'Opening balances no longer appear when you filter transactions by wallet.' },
      { kind: 'fixed', text: 'Goal and debt entries always keep the exact date you picked.' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-25',
    title: 'New, more reliable servers',
    changes: [
      { kind: 'improved', text: 'Moved to new hosting and a new database for better reliability.' },
      { kind: 'improved', text: 'Your data is now backed up automatically every day.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-23',
    title: 'Android app & new home page',
    changes: [
      { kind: 'new', text: 'Money Manager is now available as an Android app.' },
      { kind: 'new', text: 'A brand-new home page that explains everything the app can do.' },
      { kind: 'improved', text: 'The Android app opens straight to your dashboard and supports the phone back button.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-14',
    title: 'Clearer statistics',
    changes: [
      { kind: 'new', text: 'Tap a slice of the income donut to filter by that category.' },
      { kind: 'improved', text: 'Redesigned Expense and Income structure cards with bigger charts.' },
      { kind: 'improved', text: 'Clearer labels — "Remaining Balance" and the selected period are shown explicitly.' },
      { kind: 'fixed', text: 'Opening balances are no longer counted as income in statistics.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-11',
    title: 'Privacy toggles & better debt tracking',
    changes: [
      { kind: 'new', text: 'Hide or show balances with the eye icon — your choice is remembered.' },
      { kind: 'new', text: 'Edit a debt payment’s wallet, date or note after saving it.' },
      { kind: 'improved', text: 'Debt transactions get the right Loan / Debt collection category automatically.' },
      { kind: 'improved', text: 'Debt cards show which wallet money was lent from and collected into.' },
      { kind: 'fixed', text: 'Deleting a debt now correctly restores all affected wallet balances.' },
      { kind: 'fixed', text: 'Deleting a debt payment transaction also updates the debt’s settled amount.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-08',
    title: 'Account settings',
    changes: [
      { kind: 'new', text: 'Change your email address (confirmed with your password).' },
      { kind: 'improved', text: 'Delete confirmations now use a clear pop-up instead of inline buttons.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-04',
    title: 'First release',
    changes: [
      { kind: 'new', text: 'Track income, expenses and transfers across multiple wallets.' },
      { kind: 'new', text: 'Calendar view and statistics with category breakdowns and weekly trends.' },
      { kind: 'new', text: 'Monthly budgets, savings goals, debt tracker and recurring transactions.' },
      { kind: 'new', text: 'Subcategories, photo attachments and CSV export.' },
    ],
  },
];

export const LATEST_VERSION = RELEASES[0].version;
