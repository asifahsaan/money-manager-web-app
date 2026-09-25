# CLAUDE.md

## Project Identity

This project is a modern web-based personal finance / money manager application.

The app will help users manage:

* Wallets/accounts
* Income transactions
* Expense transactions
* Transfers between wallets
* Categories
* Calendar-based transaction view
* Statistics and charts
* Budgets
* Saving goals
* Payable/receivable debts
* Recurring transactions

This is a web application, not a mobile-only app. It must be responsive and work well on desktop, tablet, and mobile browsers.

## Required Tech Stack

Frontend:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui-style reusable components
* React Router
* TanStack Query
* Zustand
* React Hook Form
* Zod
* Recharts or ECharts
* date-fns

Backend:

* Node.js
* TypeScript
* Prefer NestJS for clean architecture. If NestJS is not practical, use Express with controller/service/repository structure.
* REST API
* JWT authentication
* bcrypt password hashing
* Prisma ORM
* PostgreSQL database

Database:

* PostgreSQL (production on Neon; was MySQL until Aug 2026)
* Prisma migrations
* Decimal fields for money values
* Proper indexes and foreign keys
* Local mirror of production (MySQL or SQL Server), synced daily (`npm run mirror:sync`) — backup copy only, the app never reads from it

## Important Working Rules

1. Always read `docs/PROJECT_REQUIREMENTS.md` before making major changes.
2. Do not build the full app in one attempt.
3. Work phase by phase.
4. Start with Phase 0 and Phase 1 only.
5. Do not implement Budget, Goal, Debt, Recurring, or advanced Statistics until the core finance module is stable.
6. Core finance means:

   * Authentication
   * Account/profile
   * Wallets
   * Categories
   * Transactions
   * Wallet balance calculation
   * Transaction list grouped by date
7. Do not silently assume unclear business rules.
8. If a business rule is unclear, document the assumption before coding.
9. Keep business logic in backend services, not frontend UI components.
10. Use clean TypeScript types everywhere.
11. Do not use `any` unless absolutely necessary.
12. Validate backend request bodies.
13. Validate frontend forms.
14. Use reusable frontend components.
15. After each coding step, summarize:

    * What was built
    * Files created/changed
    * How to run it
    * How to test it
    * What remains

## Core Financial Rules

1. Income increases wallet balance.

2. Expense decreases wallet balance.

3. Transfer moves money from one wallet to another.

4. Transfer affects wallet balances but should not be counted as real income or real expense in the main profit/loss overview.

5. Wallet balance formula:

   current balance =
   initial balance

   * income

   - expense

   * incoming transfers

   - outgoing transfers

6. Debt collection should create or link to an income transaction.

7. Debt payment should create or link to an expense transaction.

8. Goal deposit decreases selected wallet balance and increases saved goal amount.

9. Goal withdraw increases selected wallet balance and decreases saved goal amount.

10. Recurring transactions should store templates and next occurrence dates. Do not auto-create unlimited future transactions.

## Current State (Sep 2026)

Phases 0–4 are complete and the app is live:

* Frontend: Vercel (`frontend/.env.production` → Render API)
* Backend: Render free tier (`render.yaml`, runs `prisma migrate deploy` on build)
* Database: Neon PostgreSQL
* Android: Capacitor wrapper in `frontend/android`
* Backups: `npm run backup` (JSON) and the daily local database mirror (`npm run mirror:sync`, see README)

Rules for schema changes:

* Add a Prisma migration (`npx prisma migrate dev`) — Render applies it on deploy.
* Money fields stay `Decimal(18,2)`.
* Keep the schema portable to MySQL and SQL Server (no Postgres-only types such as arrays or `Json` path queries) so the mirror keeps working; re-run `npm run mirror:setup` after migrations.

## Original Planning Priority (historical)

Begin with planning only.

Always update docs/PROJECT_PROGRESS.md after every meaningful development step.

First create:

1. Solution architecture document
2. Product requirement summary
3. UI/UX screen map
4. Database schema proposal
5. Backend API plan
6. Frontend component plan
7. Phase-by-phase implementation roadmap

Then stop and ask for confirmation before writing code.

## Git Commit Rules

After every meaningful development step, bug fix, feature, UI change, backend change, database change, or documentation update:

1. Run:
   git status

2. Make sure these files are NEVER committed:
   - .env
   - backend/.env
   - frontend/.env
   - node_modules/
   - dist/
   - build/
   - uploads/
   - secrets/passwords/JWT/database URLs

3. Update:
   docs/PROJECT_PROGRESS.md

4. Run checks when relevant:
   - backend typecheck/build
   - frontend typecheck/build

5. Prepare a commit automatically with a clear message.

6. Commit locally without asking if the change is safe.

7. Do NOT push to GitHub unless I explicitly say:
   "push to GitHub"

Use short meaningful commit messages, for example:
- Fix transaction date filtering
- Improve desktop transaction layout
- Add calendar summary endpoint
- Update project progress documentation
