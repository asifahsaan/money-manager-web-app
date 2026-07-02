# Money Manager Web App — Product, Architecture, UI/UX, Backend, Frontend Requirements

## 1. Product Overview

We are building a modern web-based personal finance / money manager application inspired by the provided screenshots.

The app should help users track and manage their personal finances across multiple wallets/accounts. It should support income, expenses, transfers, categories, budgets, debts, goals, recurring transactions, calendar reports, and statistics.

This must be a responsive web app:

* Desktop: dashboard-style layout with sidebar/top navigation
* Tablet: responsive card/table layout
* Mobile: bottom navigation similar to the screenshots

The app should feel like a polished SaaS finance dashboard, not a rough admin panel.

---

## 2. Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui-style components
* React Router
* TanStack Query for API fetching and caching
* Zustand for local UI state
* React Hook Form for forms
* Zod for validation
* Recharts or ECharts for charts
* date-fns for date handling

### Backend

* Node.js
* TypeScript
* Prefer NestJS
* If NestJS is not practical, use Express with clean controller/service/repository architecture
* REST API
* JWT authentication
* bcrypt password hashing
* Prisma ORM

### Database

* MySQL
* Prisma migrations
* Decimal fields for all money values
* Proper indexes, relations, and foreign keys

---

## 3. Design System

### Brand Style

Primary style should be modern, clean, and finance-focused.

Primary color:

* Amber / golden yellow

Suggested colors:

* Primary Amber: `#FBBF24`
* Dark Amber: `#D97706`
* Income Blue: `#3B82F6`
* Expense Red: `#EF4444`
* Transfer Gray: `#6B7280`
* Success Green: `#10B981`
* Background: `#F8FAFC`
* Card Background: `#FFFFFF`
* Text Primary: `#111827`
* Text Secondary: `#6B7280`
* Border: `#E5E7EB`

### Amount Colors

* Income amounts: blue
* Expense amounts: red
* Transfer amounts: gray/neutral or blue depending on direction
* Positive totals: blue or green
* Negative totals: red

### UI Pattern

* White cards
* Soft borders
* Subtle shadow
* Rounded corners
* Clean tables
* Modern dashboard layout
* Colorful rounded-square category icons
* Responsive design
* Clear empty states
* Loading skeletons
* Toast notifications
* Confirmation dialogs for delete/destructive actions

### Currency

Currency must be configurable per account/user.
Default currency shown as:

`Rs.`

---

## 4. Main Navigation

The app has 4 main sections:

1. Transaction
2. Calendar
3. Statistic
4. Wallet

### Desktop Navigation

Use either:

* Left sidebar, or
* Top navigation

Prefer a left sidebar for a modern dashboard.

### Mobile Navigation

Use bottom navigation:

Transaction | Calendar | Statistic | Wallet

---

## 5. Main Screens

## 5.1 Transaction Screen

This is the home/core screen.

### Requirements

Header:

* Account selector dropdown
* Total balance
* Search icon
* Filter icon

Main content:

* Transactions grouped by date
* Each date group shows daily net total
* Each row shows:

  * Category icon
  * Transaction name/description
  * Wallet name
  * Time
  * Amount

Actions:

* Add Transaction button or floating plus button
* User can add income, expense, or transfer

### Transaction Row Examples

Income:

* Salary
* Wallet: Meezan
* Amount: Rs. 60,000 blue

Expense:

* Food
* Wallet: Cash
* Amount: -Rs. 1,500 red

Transfer:

* Transfer
* Meezan → Cash
* Amount neutral/blue depending on view

---

## 5.2 Calendar Screen

Monthly calendar view.

### Requirements

Header:

* Account selector
* Month selector with previous/next arrows
* Search optional

Summary:

* Income total for month
* Expense total for month
* Net total for month

Calendar grid:

* Show monthly grid
* Each day cell should show:

  * Income total
  * Expense total
  * Net total

Day click:

* Opens slide-up drawer/modal/panel
* Shows selected date
* Shows daily net total
* Shows that day’s transaction list
* Includes Add button

---

## 5.3 Statistic Screen

### Requirements

Period selector:

* Daily
* Weekly
* Monthly
* Quarterly
* Yearly
* All
* Custom date range

Overview:

* Opening balance
* Ending balance
* Income total
* Expense total
* Net total

Charts:

* Expense structure donut chart
* Income structure donut chart
* Category breakdown with:

  * Category icon
  * Category name
  * Amount
  * Percentage
  * Transaction count

Top 5 spending:

* Show largest 5 expenses in selected period

Sub-screens:

* Structure view
* Weekly spending view

---

## 5.4 Wallet Dashboard

This screen combines wallets, budgets, goals, debt, and recurring overview.

### Wallet Section

Show wallets as grid cards:

* Wallet icon
* Wallet name
* Wallet balance
* Wallet color
* Included/excluded from total

Example wallets:

* Cash
* Meezan
* Jazzcash Wallet
* Alfala Islamic
* BAHL
* Alfala conventional

Actions:

* Add wallet
* Manage wallets
* Edit wallet
* Archive wallet
* Include/exclude from total
* Adjust balance

### Budget Section

Show monthly budgets:

* Category
* Budget amount
* Spent amount
* Remaining amount
* Progress bar
* Line chart showing spending vs limit

### Goal Section

Show saving goals:

* Goal name
* Target amount
* Saved amount
* Remaining amount
* Progress bar
* Deposit button
* Withdraw button

### Debt Section

Show payable/receivable debts:

* Person name
* Description
* Amount
* Status
* Partial payment/collection support

### Recurring Section

Show upcoming recurring transactions:

* Name
* Amount
* Type
* Next occurrence date

---

## 6. Sub-Screens and Forms

## 6.1 Add Income

Fields:

* Date
* Time
* Amount
* Category
* Wallet
* Description
* Memo
* Photo attachment optional

Rules:

* Income increases selected wallet balance
* Amount should show as blue in lists/reports

---

## 6.2 Add Expense

Fields:

* Date
* Time
* Amount
* Category
* Wallet
* Description
* Memo
* Photo attachment optional
* Recurring toggle

Rules:

* Expense decreases selected wallet balance
* Amount should show as red in lists/reports

---

## 6.3 Add Transfer

Fields:

* Date
* Time
* Amount
* From wallet
* To wallet
* Fee toggle
* Fee amount
* Memo
* Photo attachment optional

Rules:

* Decrease from wallet
* Increase to wallet
* Fee decreases from wallet or selected fee wallet
* Transfer must not count as real income or expense in main monthly profit/loss

---

## 6.4 Add Debt

Fields:

* Type: Payable or Receivable
* Person name
* Description
* Amount
* Date
* Wallet optional
* Color

Rules:

* Receivable means someone owes user money
* Payable means user owes someone money
* Partial payment/collection is supported
* Receivable collection creates or links to an income transaction
* Payable payment creates or links to an expense transaction

---

## 6.5 Add Budget

Fields:

* Category
* Amount
* Period type
* Start date
* End date

Rules:

* Budget is linked to expense category
* Spent amount = sum of expenses in category during period
* Left amount = budget amount - spent amount

---

## 6.6 Add Goal

Fields:

* Name
* Target amount
* Goal date
* Optional wallet
* Color/icon

Rules:

* Deposit decreases selected wallet balance and increases saved amount
* Withdraw increases selected wallet balance and decreases saved amount

---

## 6.7 Manage Categories

Features:

* Income tab
* Expense tab
* Add category
* Edit category
* Delete category
* Reorder category
* Category icon
* Category color
* Optional sub-description

---

## 6.8 Wallet Detail

Show:

* Wallet name
* Wallet balance
* Initial amount
* Income count
* Expense count
* Transfer count
* Transaction list
* Category breakdown
* Adjust balance button

---

## 6.9 Structure View

Show:

* Income/Expense tabs
* Donut chart
* Category list
* Category amount
* Category percentage
* Transaction count

---

## 7. Data Model

## 7.1 User

Fields:

* id
* name
* email
* password_hash
* default_currency
* created_at
* updated_at

---

## 7.2 Account

User can have multiple finance profiles/accounts.

Example:

* Ash

Fields:

* id
* user_id
* name
* currency
* created_at
* updated_at

---

## 7.3 Wallet

Fields:

* id
* account_id
* name
* type: cash/bank/e_wallet/card/other
* icon
* color
* initial_balance
* current_balance
* included_in_total
* archived
* sort_order
* created_at
* updated_at

Rules:

* Wallet can be included/excluded from total
* Wallet can be archived
* Balance must update when transactions are created/updated/deleted

---

## 7.4 Category

Fields:

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

---

## 7.5 Transaction

Fields:

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

Rules:

* For income: use wallet_id and category_id
* For expense: use wallet_id and category_id
* For transfer: use from_wallet_id and to_wallet_id
* Transfer category may be null
* Do not store money as float
* Use decimal type

---

## 7.6 Transaction Attachment

Fields:

* id
* transaction_id
* file_url
* file_name
* mime_type
* created_at

---

## 7.7 Budget

Fields:

* id
* account_id
* category_id
* amount
* period_type: monthly/custom
* start_date
* end_date
* created_at
* updated_at

---

## 7.8 Goal

Fields:

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

---

## 7.9 Goal Entry

Fields:

* id
* goal_id
* type: deposit/withdraw
* amount
* wallet_id nullable
* transaction_id nullable
* date
* note
* created_at

---

## 7.10 Debt

Fields:

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

---

## 7.11 Debt Entry

Fields:

* id
* debt_id
* type: payment/collection
* amount
* wallet_id nullable
* transaction_id nullable
* date
* note
* created_at

---

## 7.12 Recurring

Fields:

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
* frequency: daily/weekly/monthly/yearly/custom
* start_date
* next_occurrence_date
* end_date nullable
* is_active
* created_at
* updated_at

---

## 7.13 Settings

Fields:

* id
* user_id
* key
* value
* created_at
* updated_at

---

## 8. Backend API Plan

## 8.1 Auth

* POST `/auth/register`
* POST `/auth/login`
* GET `/auth/me`

## 8.2 Accounts

* GET `/accounts`
* POST `/accounts`
* GET `/accounts/:id`
* PATCH `/accounts/:id`
* DELETE `/accounts/:id`

## 8.3 Wallets

* GET `/wallets`
* POST `/wallets`
* GET `/wallets/:id`
* PATCH `/wallets/:id`
* DELETE `/wallets/:id`
* POST `/wallets/:id/adjust-balance`

## 8.4 Categories

* GET `/categories`
* POST `/categories`
* GET `/categories/:id`
* PATCH `/categories/:id`
* DELETE `/categories/:id`
* PATCH `/categories/reorder`

## 8.5 Transactions

* GET `/transactions`
* POST `/transactions`
* GET `/transactions/:id`
* PATCH `/transactions/:id`
* DELETE `/transactions/:id`
* GET `/transactions/by-date`
* GET `/transactions/calendar-summary`

## 8.6 Statistics

* GET `/statistics/overview`
* GET `/statistics/structure`
* GET `/statistics/top-spending`
* GET `/statistics/weekly-spending`

## 8.7 Budgets

* GET `/budgets`
* POST `/budgets`
* GET `/budgets/:id`
* PATCH `/budgets/:id`
* DELETE `/budgets/:id`

## 8.8 Goals

* GET `/goals`
* POST `/goals`
* GET `/goals/:id`
* PATCH `/goals/:id`
* DELETE `/goals/:id`
* POST `/goals/:id/deposit`
* POST `/goals/:id/withdraw`

## 8.9 Debts

* GET `/debts`
* POST `/debts`
* GET `/debts/:id`
* PATCH `/debts/:id`
* DELETE `/debts/:id`
* POST `/debts/:id/payment`
* POST `/debts/:id/collection`

## 8.10 Recurring

* GET `/recurring`
* POST `/recurring`
* GET `/recurring/:id`
* PATCH `/recurring/:id`
* DELETE `/recurring/:id`
* POST `/recurring/:id/generate-transaction`

---

## 9. Frontend Page Structure

## Public Pages

* Login
* Register

## Protected Pages

* Dashboard layout
* Transaction page
* Add/Edit Transaction page or modal
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

---

## 10. Reusable Components

Create reusable components where appropriate:

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
* AppModal
* AppDrawer
* DateRangePicker
* AccountSelector
* EmptyState
* LoadingSkeleton
* FormField
* SelectField

---

## 11. Suggested Folder Structure

## Backend

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

## Frontend

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

---

## 12. Implementation Roadmap

## Phase 0 — Planning

Do first:

* Inspect existing project if there is one
* Create final architecture plan
* Create database schema
* Create UI route map
* Create backend API map
* Create implementation checklist
* Confirm assumptions

Do not write production code yet.

---

## Phase 1 — Foundation

Build:

* Backend project setup
* Frontend project setup
* MySQL connection
* Prisma setup
* Authentication
* Account model
* Basic protected dashboard layout
* Theme/design tokens
* Basic navigation

---

## Phase 2 — Core Finance

Build:

* Wallet CRUD
* Category CRUD
* Transaction CRUD
* Add income
* Add expense
* Add transfer
* Wallet balance calculation
* Transaction list grouped by date

This is the most important phase.

---

## Phase 3 — Calendar and Statistics

Build:

* Calendar monthly summary
* Day transaction drawer
* Statistic overview
* Income structure chart
* Expense structure chart
* Top 5 spending
* Weekly spending page
* Date range filters

---

## Phase 4 — Advanced Modules

Build:

* Budget module
* Goal module
* Debt module
* Recurring module

---

## Phase 5 — Polish

Build:

* Search/filter
* Settings
* Currency configuration
* Attachments
* Export CSV/Excel
* Empty states
* Loading skeletons
* Responsive polishing
* Testing

---

## 13. Screenshot Reference Guide

Screenshots are stored in:

`docs/screenshots/`

Use screenshots only as visual/product reference.

Expected screenshot types:

* Transaction list
* Calendar monthly view
* Day transaction panel
* Add income
* Add expense
* Add transfer
* Select wallet
* Select category
* Wallet dashboard
* Wallet list/manage
* Wallet detail
* Statistic overview
* Structure donut chart
* Weekly spending
* Budget detail
* Goal detail
* Debt list
* Debt detail
* Recurring list
* Manage categories

If image reading is limited, rely on this written requirements document.

---

## 14. MVP Priority

The MVP must first prove:

1. User can register/login
2. User can create an account/profile
3. User can create wallets
4. User can create income/expense categories
5. User can add income
6. User can add expense
7. User can transfer between wallets
8. Wallet balances update correctly
9. Transactions display grouped by date
10. Monthly totals are calculated correctly

Do not start advanced modules until this MVP works reliably.

---

## 15. Quality Requirements

* Use TypeScript strictly
* Use clear folder structure
* Use reusable components
* Use backend validation
* Use frontend validation
* Use Decimal for money
* Use transaction-safe database updates for wallet balance changes
* Avoid duplicated business logic
* Avoid hardcoded currency except default setting
* Add useful comments only where needed
* Make the UI polished and responsive

---

## 16. Initial Default Data

When a new account/profile is created, optionally seed default categories.

Income:

* Salary
* Tips
* Bonus
* Allowance
* Investment
* Debt collection
* Others

Expense:

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

---

## 17. Final Instruction

Start with Phase 0.

Create:

1. Solution architecture summary
2. Product requirement summary
3. UI/UX screen map
4. Database schema proposal
5. Backend API plan
6. Frontend component plan
7. Phase-by-phase implementation roadmap

Then stop and ask for confirmation before implementing Phase 1.
