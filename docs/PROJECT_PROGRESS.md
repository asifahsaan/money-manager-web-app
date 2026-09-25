# Money Manager — Project Progress

## Current Phase
**Phase 4 — Wallet Sub-features — ✅ COMPLETE** (plus post-Phase-4 work below)
**Awaiting approval to start Phase 5**

## Live Deployment (Sep 2026)
| Part | Where |
|---|---|
| Frontend | Vercel — money-manager-web-app.vercel.app |
| Backend | Render free tier — `render.yaml` |
| Database | Neon PostgreSQL |
| Local mirror | SQL Server 2025 on the dev PC (`MoneyManagerMirror`), synced daily — MySQL also supported |

---

## Phase 0: Planning — ✅ COMPLETE
Architecture, screen map, DB schema, API plan, component plan, roadmap, assumptions/questions all written and approved by user.

---

## Phase 1: Foundation — ✅ COMPLETE

### Completed Tasks
- [x] Backend NestJS project setup
- [x] Frontend React + Vite project setup
- [x] MySQL via docker-compose.yml (later replaced by PostgreSQL — see below)
- [x] Prisma schema (13 models, 9 enums, named relations for multi-FK wallets)
- [x] Auth endpoints: POST /auth/register, POST /auth/login, GET /auth/me
- [x] JWT auth guard (JwtAuthGuard, JwtStrategy, passport-jwt)
- [x] User model + UsersService
- [x] Account model + auto-create default account on registration
- [x] Seed 24 default categories (10 income + 14 expense) on new Account
- [x] Accounts CRUD: GET /accounts, GET /:id, POST, PATCH, DELETE
- [x] Global response interceptor `{ success: true, data }`
- [x] Global HTTP exception filter `{ success: false, statusCode, message, path, timestamp }`
- [x] Axios instance with JWT interceptor + 401 auto-redirect to /login
- [x] Zustand auth store + account store (localStorage persistence)
- [x] TanStack Query v5 (QueryClientProvider, staleTime 2min)
- [x] Dashboard layout: Sidebar (desktop ≥lg) + BottomNav (mobile)
- [x] Login page — React Hook Form + Zod validation
- [x] Register page — React Hook Form + Zod + cross-field confirm password
- [x] Protected routes — DashboardLayout redirects unauthenticated to /login
- [x] AuthLayout — redirects authenticated users away from /login, /register
- [x] AccountSelector dropdown in header
- [x] Theme/design tokens: amber primary, income blue, expense red, transfer gray
- [x] Custom CSS utilities: .card, .amount-income, .amount-expense, etc.
- [x] Placeholder pages for /transactions, /calendar, /statistics, /wallet
- [x] TypeScript: zero errors (backend `tsc --noEmit` ✅, frontend `tsc --noEmit` ✅)
- [x] Frontend production build: ✅ (426 kB JS bundle)
- [x] Backend NestJS build: ✅
- [x] UI manually verified via preview (login, register, desktop sidebar, mobile bottom nav)

---

## Phase 2: Transactions — ✅ COMPLETE

### Completed Tasks
- [x] Wallet CRUD (cash / bank / card / e-wallet types)
- [x] Transaction CRUD (income / expense / transfer)
- [x] Atomic wallet balance recalculation (`$transaction` for every change)
- [x] Transfer: debits from-wallet, credits to-wallet, excluded from P&L
- [x] Transaction list endpoint with filters: date range, type, category, wallet
- [x] Pagination (offset-based) with total count
- [x] CSV export endpoint
- [x] Frontend: Transaction list page with filters and grouped-by-date view
- [x] Add/Edit transaction modal with photo attachment support
- [x] Balance display per wallet in the wallet page

---

## Phase 3: Calendar & Statistics — ✅ COMPLETE

### Completed Tasks
- [x] Calendar page with monthly view
- [x] Daily income/expense markers on calendar days
- [x] Click day to see transactions for that date
- [x] Statistics page with Recharts charts
- [x] Monthly income vs expense bar chart
- [x] Category breakdown pie/donut chart
- [x] Period selector (week / month / year / custom)
- [x] Fixed calendar query key to use `['calendar-transactions', ...]`
- [x] Fixed `@Max(200)` → `@Max(1000)` on limit DTO so calendar `limit: 1000` queries work

---

## Phase 4: Wallet Sub-features — ✅ COMPLETE

### Completed Tasks
- [x] Budget module: create, list, delete budgets per category with spent tracking
- [x] Saving Goals module: create goals, deposit/withdraw with wallet balance sync
- [x] Debt Tracker: payable and receivable debts, record payments/collections
- [x] Recurring Transactions: template-based, store next occurrence date
- [x] Wallet page with 4 sub-tabs: Wallets | Budget | Goals | Debts | Recurring
- [x] All sub-tab create/edit forms converted from inline panels to modal overlays
  - BudgetTab: "New Budget" modal
  - GoalsTab: "New Goal" modal + "Deposit/Withdraw" entry modal
  - DebtTab: "New Debt" modal + "Record Payment/Collection" modal
  - RecurringTab: "New Recurring" modal
- [x] Modal pattern: `fixed inset-0 z-50` overlay with `bg-black/40` backdrop, bottom-sheet on mobile, centered on desktop
- [x] Fixed UTC timezone bug in `buildDates` and `buildWhere` in `transactions.service.ts`
  - `new Date(dateStr + 'T00:00:00')` (local time) → `new Date(dateStr + 'T00:00:00.000Z')` (UTC)
  - Prevents date shifting for users in UTC+ timezones (e.g. PKT UTC+5)

---

## Post-Phase-4 Work — ✅ COMPLETE

- [x] Admin panel with role-based access (USER / ADMIN / SUPERADMIN) and BI reports
- [x] Change email with password confirmation
- [x] Show/hide balance toggles (persisted to localStorage)
- [x] Debt improvements: entry editing, wallet labels, auto Loan/Debt category, full reversal on delete
- [x] Opening Balance transactions hidden from list and excluded from statistics
- [x] Statistics redesign: Expense/Income structure cards, donut click filtering
- [x] Public landing page at `/`
- [x] Capacitor Android wrapper (APK build), native-friendly UX (safe-area, back button, status bar)
- [x] **Aug 2026:** Railway trial expired (data lost) → moved to **Render (backend) + Neon (PostgreSQL)**
  - Prisma provider switched MySQL → PostgreSQL, fresh `20260824201624_init` migration
- [x] JSON backup/restore scripts (`npm run backup`, `npm run restore <file>`)
- [x] **Sep 2026:** Local database mirror of production (MySQL or SQL Server, chosen by `MIRROR_DATABASE_URL`)
  - `npm run mirror:setup` builds `prisma/mirror/schema.prisma` from the main schema and pushes it
  - SQL Server adaptation: enums → NVARCHAR, NVARCHAR for text, no DB-level FKs, plain INT ids
  - `npm run mirror:sync` copies every table Neon → local mirror in one transaction, saves a daily JSON snapshot (keeps 30), logs to `backups/mirror-sync.log`
  - Shrink guard: aborts if production has < 50% of the mirror's rows (protects against a wiped host)
  - `scripts/mirror/register-daily-task.ps1` registers a daily Windows Scheduled Task
- [x] Stopped committing `backend/dist` (Render builds it); docs updated for PostgreSQL

## Security & Correctness Hardening (Sep 2026) — ✅ COMPLETE

Found in a full code review; verified end-to-end against an isolated Postgres (19/19 checks).

- [x] **Cross-account tampering fixed** — every `walletId` / `categoryId` / `parentCategoryId` in
  transactions (create + update), goals, debts, recurrings, budgets and categories must belong to the
  same account (`src/common/utils/ownership.ts`). Before: any user could change another user's wallet
  balance by guessing its id.
- [x] App refuses to start without `JWT_SECRET` (no more `'fallback-secret'`)
- [x] Deactivated / deleted users are rejected at login and on every request (JWT re-validated)
- [x] Rate limiting (`@nestjs/throttler`): 300 req/min/IP globally, login 10/15 min, register 5/hour,
  change password/email 5/15 min; `trust proxy` set for Render
- [x] `helmet` security headers (cross-origin resource policy kept open for `/uploads` images)
- [x] Search is case-insensitive again (lost in the MySQL → PostgreSQL switch)
- [x] Opening balance marked by `transactions.isOpeningBalance` (migration `20260926000000`, backfilled)
  instead of matching the description text — fixes it reappearing under the wallet filter and
  user transactions named "Opening Balance" disappearing
- [x] Goal/debt/statistics dates parsed as UTC (same fix as transactions had)

- [x] **What's New** panel in the header — full release history (v1.0.0 → v1.6.0) from
  `frontend/src/data/releases.ts`, red dot until the user opens the latest release

## UI/UX Redesign — v1.7.0 (Sep 2026) — ✅ COMPLETE

- [x] Token-based design system (CSS variables) — brand moved from amber to indigo for WCAG-AA
  contrast on buttons; income = emerald, expense = rose
- [x] Dark mode (light / dark / system), no flash on load; Appearance setting in Settings
- [x] New app shell: sidebar with user card, header with page title + "Add transaction",
  5-tab mobile nav, collapsible sidebar remembered
- [x] New **Overview** home: net worth, income/expense vs last month, savings rate, 6-month cash
  flow, wallets, recent transactions, top spending, budgets, goals
- [x] Split-screen login/register; landing page on the new brand
- [x] Bundle: route code-splitting + curated icon map — first load 427 KB → 167 KB gzip
- [x] Fixed: all category icons rendered as "Tag"; stale stats/calendar/budgets after adding a
  transaction; "Rs." wrapping onto its own line; E-wallet icon never matched

### Still open from the review
- Attachments stored on Render's ephemeral disk and served without auth → move to cloud storage
- No automated tests; no wallet-balance reconciliation job
- Money math uses `Number()` in debt/goal services instead of Decimal
- Recurring transactions only run when executed manually
- Render free-tier cold starts; onboarding; privacy policy / account deletion / data export

---

## Bug Fixes Applied

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Calendar shows Rs. 0 | `@Max(200)` on limit DTO rejected `limit: 1000` with 400 | Changed to `@Max(1000)` in `query-transaction.dto.ts` |
| Transactions created but not shown | `new Date('2026-07-01T00:00:00')` parsed as local time (PKT) → UTC date shifts to June 30 | Append `.000Z` to force UTC in `buildDates` and `buildWhere` |
| Inline forms blocked empty state UI | Empty-state guard `budgets.length === 0 && !showForm` hid empty-state while form was modal | Removed `!showForm`/`!showCreate` guards from empty-state conditions |

---

## How to Run

### Prerequisites
- Node.js 18+
- PostgreSQL: a Neon branch, or `docker compose up -d postgres`
- (Optional) MySQL 8 or SQL Server for the local mirror

### Backend
```bash
cd backend
cp .env.example .env        # DATABASE_URL (Postgres), JWT_SECRET, optional MIRROR_DATABASE_URL
npm install
npx prisma migrate deploy
npm run start:dev            # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

### Local database mirror
```bash
cd backend
npm run mirror:setup         # once, and after every schema migration
npm run mirror:sync          # manual run; the scheduled task runs it daily
```

---

## Phase 5 — Proposed Scope (Awaiting Approval)
- File/photo attachments for transactions (upload, display, delete)
- Profile settings page (name, email, password change, currency preference)
- App-wide currency formatting using user's preferred currency
- Notification/reminder system for recurring transactions due
- Dark mode support
- PWA manifest + service worker for offline capability
