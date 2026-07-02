You are acting as a senior Solution Architect, Product Designer, UI/UX Designer, Backend Developer, Frontend Developer, Database Architect, and QA Engineer.

We are building a modern web-based personal finance / money manager application inspired by the screenshots and product notes provided.

The product should be a full web application, not mobile-only. It must be responsive, so it works well on desktop, tablet, and mobile browsers.

Project Name:
Money Manager Web App

Primary Goal:
Build a modern personal finance management web app where users can manage wallets/accounts, record income, expenses, transfers, budgets, debts, saving goals, recurring transactions, and view calendar/statistics reports.

Tech Stack:
Frontend:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui-style reusable components
* React Router
* TanStack Query for API data fetching/caching
* Zustand for lightweight local UI state
* React Hook Form for forms
* Zod for validation
* Recharts or ECharts for charts
* date-fns for date handling

Backend:

* Node.js
* TypeScript
* Prefer NestJS for clean architecture. If NestJS is not available, use Express with a clean service/controller/repository structure.
* REST API
* JWT authentication
* bcrypt password hashing
* Prisma ORM
* MySQL database

Database:

* MySQL
* Use Prisma migrations
* Add proper indexes, foreign keys, and decimal fields for money values

Design System:

* Primary color: Amber / golden yellow
* Income amount color: Blue
* Expense amount color: Red
* Transfer amount color: Gray/neutral or blue depending on context
* Background: clean light theme first
* Cards: white background, soft border, subtle shadow
* Category icons: colorful rounded-square badges
* Currency: configurable, default “Rs.”
* Typography: modern, readable, dashboard-style
* UI should look like a polished SaaS finance dashboard, not a rough admin panel

Main Navigation:
The app should have 4 main sections:

1. Transaction
2. Calendar
3. Statistic
4. Wallet

For desktop:

* Use a left sidebar or top navigation with these 4 main sections.
* Use a clean dashboard layout.

For mobile responsive:

* Use bottom navigation with the same 4 tabs:
  Transaction | Calendar | Statistic | Wallet

Core Product Rules:

1. Income increases wallet balance.
2. Expense decreases wallet balance.
3. Transfer moves money from one wallet to another.
4. Transfer should affect wallet balances but should not be counted as real income or real expense in the main profit/loss overview.
5. Wallet balance formula:
   current balance = initial balance + income - expense + incoming transfers - outgoing transfers.
6. User can have multiple accounts/profiles, for example “Ash”.
7. Wallets can be included or excluded from total balance.
8. Categories are separate for income and expense.
9. Budgets are linked to expense categories.
10. Debts can be Payable or Receivable.
11. Debt collection should be linked with an income transaction.
12. Debt payment should be linked with an expense transaction.
13. Goals have deposit/withdraw history.
14. Recurring transactions should store a reusable template and next occurrence date.
15. All money values must use decimal type, not floating point.
16. All list/report screens must support date filtering.
17. Do not silently assume unclear business rules. If something is unclear, document the assumption before coding.

Main Modules:

1. Authentication

* Register
* Login
* Logout
* JWT token auth
* Protected routes
* Basic user profile
* Default currency setting

2. Account/Profile Management

* User can have one or more finance profiles/accounts.
* Example account name: “Ash”
* Each account contains wallets, transactions, budgets, goals, debts, and recurring items.

3. Wallet Module
   Features:

* Add wallet
* Edit wallet
* Delete/archive wallet
* Include/exclude wallet from total
* Initial balance
* Current balance
* Wallet type: cash, bank, e-wallet, card, other
* Wallet color and icon
* Wallet dashboard cards
* Wallet detail screen
* Adjust balance feature
* Wallet transaction breakdown by category

Wallet examples:

* Cash
* Meezan
* Jazzcash Wallet
* Alfala Islamic
* BAHL
* Alfala conventional

4. Category Module
   Features:

* Income categories
* Expense categories
* Add/edit/delete category
* Reorder categories
* Category icon
* Category color
* Optional sub-description/sub-items

Income category examples:

* Salary
* Tips
* Bonus
* Allowance
* Investment
* Debt collection
* Others

Expense category examples:

* Transportation
* Food
* Bills/Net payment
* Home expenses
* Shopping
* Loan
* Others
* Clothing
* Education
* Entertainment
* Fitness
* Gifts
* Health
* Furniture

5. Transaction Module
   This is the core module.

Transaction types:

* income
* expense
* transfer

Transaction list screen:

* Account selector dropdown in header
* Total balance in header
* Search icon
* Filter icon
* Transactions grouped by date
* Each date group shows daily net total
* Each row shows:

  * Category icon
  * Transaction title/description
  * Wallet name
  * Time
  * Amount
* Income amount should be blue
* Expense amount should be red
* Transfer should show from wallet → to wallet
* Floating Add button or prominent “Add Transaction” button

Add Income screen fields:

* Date
* Time
* Amount
* Category
* Wallet
* Description
* Memo
* Photo attachment optional

Add Expense screen fields:

* Date
* Time
* Amount
* Category
* Wallet
* Description
* Memo
* Photo attachment optional
* Recurring toggle

Add Transfer screen fields:

* Date
* Time
* Amount
* From wallet
* To wallet
* Fee toggle
* Fee amount
* Memo
* Photo attachment optional

6. Calendar Module
   Monthly calendar view:

* Month navigation previous/next
* Header totals:

  * Income
  * Expense
  * Total
* Monthly grid
* Each day cell shows:

  * Income total for that day
  * Expense total for that day
  * Net total for that day
* Clicking a day opens slide-up panel/drawer/modal with that day’s transactions
* Day panel should include:

  * Date
  * Daily net total
  * Transaction list
  * Add button

7. Statistic Module
   Main statistic screen:

* Period selector
* Opening balance
* Ending balance
* Income total
* Expense total
* Net total
* Expense structure donut chart
* Income structure donut chart
* Category percentage breakdown
* Top 5 spending list

Time range picker:

* Daily
* Weekly
* Monthly
* Quarterly
* Yearly
* All
* Custom date range

Structure sub-screen:

* Income/Expense tabs
* Donut chart
* Category list with amount, percentage, and transaction count

Weekly Spending sub-screen:

* Week navigation
* Bar chart Monday to Sunday
* Total weekly expense
* Daily list with amount and transaction count

8. Budget Module
   Budget dashboard:

* Monthly budgets per category
* Remaining amount
* Progress bar
* Spending vs limit chart
* Recommended daily amount
* Average daily spending
* Related transaction list

Add Budget fields:

* Category
* Amount
* Period type
* Start date
* End date

Budget calculation:
spent = sum of expense transactions in selected category during budget period
left = budget amount - spent

9. Goal Module
   Goal dashboard:

* Goal name
* Target amount
* Saved amount
* Remaining amount
* Goal date
* Progress bar
* Deposit button
* Withdraw button
* Goal transaction history

Add Goal fields:

* Name
* Target amount
* Goal date
* Optional wallet
* Color/icon

Important:
Clearly define whether goal deposit/withdraw affects wallet balance.
Default rule:

* Goal deposit decreases selected wallet balance and increases saved amount.
* Goal withdraw increases selected wallet balance and decreases saved amount.

10. Debt Module
    Debt types:

* Payable: money user owes someone
* Receivable: money someone owes user

Debt list:

* Payable tab
* Receivable tab
* Not yet paid/received total
* Paid/received total
* Person name
* Description
* Amount
* Status
* Partial payment support

Add Debt fields:

* Type: Payable or Receivable
* Person name
* Description
* Amount
* Date
* Wallet optional
* Color

Debt detail:

* Total amount
* Paid/received amount
* Remaining amount
* Payment/collection history
* Add payment/collection button

Default rules:

* Receivable collection creates income transaction.
* Payable payment creates expense transaction.

11. Recurring Module
    Recurring list:

* Transaction name
* Amount
* Type: income/expense/transfer
* Category
* Wallet
* Frequency
* Next occurrence date
* Active/inactive status

Add recurring fields:

* Transaction type
* Amount
* Category
* Wallet/from wallet/to wallet
* Frequency: daily, weekly, monthly, yearly, custom
* Start date
* End date optional
* Next occurrence date
* Memo

Recurring behavior:

* Store recurring template.
* Do not auto-create unlimited future transactions.
* Create/generate transaction only when due or when user confirms.
* Build backend service structure so future cron job can process recurring transactions.

Suggested Database Models:

User:

* id
* name
* email
* password_hash
* default_currency
* created_at
* updated_at

Account:

* id
* user_id
* name
* currency
* created_at
* updated_at

Wallet:

* id
* account_id
* name
* type
* icon
* color
* initial_balance
* current_balance
* included_in_total
* archived
* sort_order
* created_at
* updated_at

Category:

* id
* account_id
* name
* type: income/expense
* icon
* color
* parent_category_id nullable
* description
* sort_order
* is_default
* created_at
* updated_at

Transaction:

* id
* account_id
* type: income/expense/transfer
* amount
* date
* time
* datetime
* description
* memo
* category_id nullable
* wallet_id nullable
* from_wallet_id nullable
* to_wallet_id nullable
* fee_amount default 0
* recurring_id nullable
* debt_id nullable
* goal_id nullable
* created_at
* updated_at

TransactionAttachment:

* id
* transaction_id
* file_url
* file_name
* mime_type
* created_at

Budget:

* id
* account_id
* category_id
* amount
* period_type: monthly/custom
* start_date
* end_date
* created_at
* updated_at

Goal:

* id
* account_id
* name
* target_amount
* saved_amount
* goal_date
* wallet_id nullable
* icon
* color
* created_at
* updated_at

GoalEntry:

* id
* goal_id
* type: deposit/withdraw
* amount
* wallet_id nullable
* transaction_id nullable
* date
* note
* created_at

Debt:

* id
* account_id
* type: payable/receivable
* person_name
* description
* total_amount
* settled_amount
* remaining_amount
* wallet_id nullable
* color
* status: open/partial/closed
* date
* created_at
* updated_at

DebtEntry:

* id
* debt_id
* type: payment/collection
* amount
* wallet_id nullable
* transaction_id nullable
* date
* note
* created_at

Recurring:

* id
* account_id
* transaction_type
* amount
* description
* memo
* category_id nullable
* wallet_id nullable
* from_wallet_id nullable
* to_wallet_id nullable
* frequency
* start_date
* next_occurrence_date
* end_date nullable
* is_active
* created_at
* updated_at

Settings:

* id
* user_id
* key
* value
* created_at
* updated_at

Required API Endpoints:

Auth:

* POST /auth/register
* POST /auth/login
* GET /auth/me

Accounts:

* GET /accounts
* POST /accounts
* PATCH /accounts/:id
* DELETE /accounts/:id

Wallets:

* GET /wallets
* POST /wallets
* GET /wallets/:id
* PATCH /wallets/:id
* DELETE /wallets/:id
* POST /wallets/:id/adjust-balance

Categories:

* GET /categories
* POST /categories
* PATCH /categories/:id
* DELETE /categories/:id
* PATCH /categories/reorder

Transactions:

* GET /transactions
* POST /transactions
* GET /transactions/:id
* PATCH /transactions/:id
* DELETE /transactions/:id
* GET /transactions/by-date
* GET /transactions/calendar-summary

Statistics:

* GET /statistics/overview
* GET /statistics/structure
* GET /statistics/top-spending
* GET /statistics/weekly-spending

Budgets:

* GET /budgets
* POST /budgets
* GET /budgets/:id
* PATCH /budgets/:id
* DELETE /budgets/:id

Goals:

* GET /goals
* POST /goals
* GET /goals/:id
* PATCH /goals/:id
* DELETE /goals/:id
* POST /goals/:id/deposit
* POST /goals/:id/withdraw

Debts:

* GET /debts
* POST /debts
* GET /debts/:id
* PATCH /debts/:id
* DELETE /debts/:id
* POST /debts/:id/payment
* POST /debts/:id/collection

Recurring:

* GET /recurring
* POST /recurring
* PATCH /recurring/:id
* DELETE /recurring/:id
* POST /recurring/:id/generate-transaction

Frontend Page Structure:

Public:

* Login
* Register

Protected:

* Dashboard layout
* Transaction page
* Add/Edit Transaction modal/page
* Calendar page
* Statistic page
* Structure report page
* Weekly spending page
* Wallet dashboard page
* Wallet detail page
* Manage wallets page
* Manage categories page
* Budget detail page
* Goal detail page
* Debt list page
* Debt detail page
* Recurring list page
* Settings page

Frontend UX Requirements:

* Use clean dashboard cards.
* Use responsive layout.
* On desktop, show richer tables and side panels.
* On mobile, use card lists and bottom navigation.
* All forms should have validation.
* All destructive actions should require confirmation.
* Use loading skeletons.
* Use empty states.
* Use toast notifications for success/error.
* Use consistent date and currency formatting.
* Use reusable components:

  * AmountText
  * CurrencyText
  * CategoryIconBadge
  * WalletCard
  * TransactionRow
  * DateGroup
  * DonutChartCard
  * StatCard
  * ProgressBar
  * PageHeader
  * FilterBar
  * ConfirmDialog
  * AppModal/AppDrawer

Folder Structure:

Backend:
src/

* auth/
* users/
* accounts/
* wallets/
* categories/
* transactions/
* statistics/
* budgets/
* goals/
* debts/
* recurring/
* common/
* database/
* prisma/
* utils/

Frontend:
src/

* app/
* routes/
* layouts/
* pages/
* components/
* features/

  * auth/
  * wallets/
  * categories/
  * transactions/
  * calendar/
  * statistics/
  * budgets/
  * goals/
  * debts/
  * recurring/
* hooks/
* lib/
* services/
* stores/
* theme/
* utils/
* types/

Implementation Plan:
Do not build everything in one attempt. Build phase by phase.

Phase 0: Planning

* Inspect existing project if any.
* Create final architecture plan.
* Create database schema.
* Create UI route map.
* Create implementation checklist.
* Confirm assumptions.

Phase 1: Foundation

* Set up backend project.
* Set up frontend project.
* Configure MySQL and Prisma.
* Create authentication.
* Create account model.
* Create basic dashboard layout.
* Create theme/design tokens.

Phase 2: Core Finance

* Wallet CRUD.
* Category CRUD.
* Transaction CRUD.
* Add income.
* Add expense.
* Add transfer.
* Wallet balance calculation.
* Transaction list grouped by date.

Phase 3: Calendar and Statistics

* Calendar monthly summary.
* Day transaction drawer.
* Statistic overview.
* Income/expense structure donut chart.
* Top 5 spending.
* Weekly spending page.

Phase 4: Advanced Modules

* Budget module.
* Goal module.
* Debt module.
* Recurring module.

Phase 5: Polish

* Search/filter.
* Settings.
* Currency configuration.
* Attachments.
* Export CSV/Excel.
* Better empty states.
* Responsive polishing.
* Testing.

Coding Instructions:

* Write clean, maintainable, production-style code.
* Use TypeScript types everywhere.
* Do not use any type unless absolutely necessary.
* Validate backend request bodies.
* Validate frontend forms.
* Use consistent naming.
* Keep business logic in services, not UI components.
* Keep database logic separated from controllers.
* Add comments only where helpful.
* After every implementation step, explain:

  1. What was built
  2. Files created/changed
  3. How to run it
  4. How to test it
  5. What remains

Important:
Start with Phase 0 and Phase 1 only. Do not jump to charts, budgets, debts, goals, or recurring before wallets, categories, transactions, and balance logic are stable.

Now begin by creating:

1. A solution architecture document
2. Product requirement document
3. UI/UX screen map
4. Database schema proposal
5. Backend API plan
6. Frontend component plan
7. Phase-by-phase implementation roadmap

After that, ask for confirmation before writing code.
