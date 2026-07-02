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
* MySQL database

Database:

* MySQL
* Prisma migrations
* Decimal fields for money values
* Proper indexes and foreign keys

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

## Current Priority

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
