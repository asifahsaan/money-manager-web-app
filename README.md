# 💰 Money Manager — Personal Finance Web App

A full-stack personal finance management application with expense tracking, budgets, goals, debt tracking, and detailed statistics.

**Live Demo:** [money-manager-web-app.vercel.app](https://money-manager-web-app.vercel.app)

---

## ✨ Features

- **Transactions** — Add income, expenses, and transfers with categories, subcategories, and attachments
- **Statistics** — Donut charts, top spending, weekly trends, and category breakdowns with group view
- **Budgets** — Set monthly budgets per category with subcategory rollup tracking
- **Goals** — Create savings goals with deposit/withdraw tracking and progress bars
- **Debt Tracker** — Track payable and receivable debts with partial payment history
- **Recurring Transactions** — Schedule repeating income/expense entries
- **Wallet Management** — Multiple wallets (bank, cash, etc.) with balance tracking
- **Calendar View** — Browse transactions by date
- **CSV Export** — Export transactions to CSV
- **Multi-currency** — Configurable currency per account
- **Admin Panel** — Role-based (Admin / Superadmin) user management and BI reports
- **Landing Page** — Public marketing page at the root route
- **Android App** — Capacitor wrapper builds a native APK from the same frontend
- **Local MySQL Mirror** — Daily automatic copy of the production database to a local MySQL server

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5 |
| Styling | Tailwind CSS, Glass morphism UI |
| Charts | Recharts |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (Neon) — plus a local MySQL mirror for backups |
| Auth | JWT (access + refresh tokens) |
| Mobile | Capacitor (Android) |
| Deployment | Vercel (frontend) + Render (backend) + Neon (PostgreSQL) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database — a free [Neon](https://neon.tech) branch, or `docker compose up -d postgres`
- *(Optional)* MySQL 8 — only for the local production mirror

### 1. Clone the repo
```bash
git clone https://github.com/asifahsaan/money-manager-web-app.git
cd money-manager-web-app
```

### 2. Setup backend
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL (PostgreSQL) and JWT_SECRET in .env
npm install
npx prisma migrate deploy
npm run start:dev
```

### 3. Setup frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` — Backend API at `http://localhost:3001`.

---

## 💾 Backups & Local MySQL Mirror

Production data lives on Neon (PostgreSQL). Two safety nets keep a copy on your machine:

| Command (in `backend/`) | What it does |
|---|---|
| `npm run backup` | Exports every table to `backups/backup-<timestamp>.json` |
| `npm run restore <file>` | Re-inserts a JSON backup into `DATABASE_URL` (skips duplicates) |
| `npm run mirror:setup` | Creates/updates the MySQL mirror tables from the Prisma schema |
| `npm run mirror:sync` | Copies all production data into MySQL + saves `backups/daily/snapshot-<date>.json` |

**One-time setup**
1. Install MySQL 8 (or `docker compose up -d mysql`) and create a database, e.g. `money_manager_mirror`.
2. In `backend/.env`, set `DATABASE_URL` to the **production** Neon URL and `MIRROR_DATABASE_URL` to the local MySQL URL.
3. `npm run mirror:setup`, then `npm run mirror:sync` once to test.
4. Schedule it daily (Windows):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\mirror\register-daily-task.ps1 -At 23:00
   ```
   If the PC is off at that time, the task runs as soon as it is back on.

**Safety:** each sync replaces the mirror inside one transaction (a failed run leaves the old copy intact), and it refuses to run if production suddenly has less than half the mirror's rows — so a wiped hosted DB never overwrites your last good local copy (`--force` overrides). The last 30 daily JSON snapshots are kept. Logs: `backend/backups/mirror-sync.log`.

After a schema change (new migration), re-run `npm run mirror:setup` so the mirror gets the new columns.

---

## 📁 Project Structure

```
money-manager-web-app/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── pages/     # Transactions, Statistics, Wallet, Calendar
│   │   ├── components/
│   │   ├── services/  # API service layer
│   │   ├── stores/    # Zustand state management
│   │   └── types/     # TypeScript interfaces
├── backend/           # NestJS API
│   ├── src/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── debts/
│   │   ├── statistics/
│   │   └── auth/
│   ├── prisma/        # Database schema & migrations
│   └── scripts/       # Backup, restore, MySQL mirror sync
└── docker-compose.yml # Optional local Postgres (dev) + MySQL (mirror)
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [money-manager-web-app.vercel.app](https://money-manager-web-app.vercel.app) |
| Backend API | Render (free) | `money-manager-backend-6wce.onrender.com` — config in `render.yaml` |
| Database | Neon | Managed PostgreSQL |
| Local mirror | Your PC | MySQL 8, synced daily |

---

## 📸 Screenshots

| Transactions | Statistics | Wallet |
|---|---|---|
| Month view with sidebar | Donut charts + breakdowns | Budgets, Goals, Debts |

---

## 📄 License

MIT © [Asif Ahsaan](https://github.com/asifahsaan)
