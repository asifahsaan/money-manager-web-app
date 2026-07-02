# Money Manager — Project Progress

## Current Phase
**Phase 3 — Calendar & Statistics — ✅ COMPLETE**
**Awaiting approval to start Phase 4**

---

## Phase 0: Planning — ✅ COMPLETE
Architecture, screen map, DB schema, API plan, component plan, roadmap, assumptions/questions all written and approved by user.

---

## Phase 1: Foundation — ✅ COMPLETE

### Completed Tasks
- [x] Backend NestJS project setup
- [x] Frontend React + Vite project setup
- [x] MySQL via docker-compose.yml
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

## Files Created — Phase 1

### Root
- `docker-compose.yml`
- `.env.example`
- `.gitignore`

### Backend (`backend/`)
- `package.json`, `tsconfig.json`, `nest-cli.json`, `.env.example`
- `prisma/schema.prisma`
- `src/main.ts`, `src/app.module.ts`
- `src/prisma/prisma.service.ts`, `prisma.module.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/common/interceptors/response.interceptor.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/auth/dto/register.dto.ts`, `login.dto.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/auth.service.ts`, `auth.controller.ts`, `auth.module.ts`
- `src/users/users.service.ts`, `users.module.ts`
- `src/accounts/accounts.service.ts`, `accounts.controller.ts`, `accounts.module.ts` + DTOs
- `src/categories/categories.service.ts`, `categories.module.ts`
- `src/categories/seeds/default-categories.seed.ts`

### Frontend (`frontend/`)
- `package.json`, `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.env.example`
- `index.html`
- `src/vite-env.d.ts`
- `src/main.tsx`, `src/App.tsx`, `src/index.css`
- `src/types/index.ts`
- `src/lib/axios.ts`, `src/lib/utils.ts`
- `src/stores/auth.store.ts`, `src/stores/account.store.ts`
- `src/services/auth.service.ts`, `src/services/account.service.ts`
- `src/layouts/AuthLayout.tsx`, `src/layouts/DashboardLayout.tsx`
- `src/components/shared/AccountSelector.tsx`
- `src/components/shared/Sidebar.tsx`
- `src/components/shared/BottomNav.tsx`
- `src/pages/auth/LoginPage.tsx`, `src/pages/auth/RegisterPage.tsx`
- `src/pages/PlaceholderPage.tsx`

---

## API Endpoints (Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | Public | Register, auto-create account + seed categories |
| POST | /api/auth/login | Public | Login → JWT |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/accounts | JWT | List user's accounts |
| GET | /api/accounts/:id | JWT | Get account (ownership check) |
| POST | /api/accounts | JWT | Create account |
| PATCH | /api/accounts/:id | JWT | Update account |
| DELETE | /api/accounts/:id | JWT | Delete account |

---

## How to Run

### Prerequisites
- Docker Desktop running
- Node.js 18+

### Step 1: Start MySQL
```bash
# From D:\_expenseTracker\
cp .env.example .env        # edit passwords as needed
docker-compose up -d
```

### Step 2: Backend
```bash
cd backend
cp .env.example .env        # fill JWT_SECRET, DB_* credentials
npm install
npx prisma migrate dev --name init
npm run start:dev            # http://localhost:3001
```

### Step 3: Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

---

## Test Commands (curl)

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"secret123"}'
# Expected: { success: true, data: { token, user, defaultAccountId } }

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
# Expected: { success: true, data: { token, user } }

# Get me (replace <TOKEN>)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# List accounts
curl http://localhost:3001/api/accounts \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 1 default account with seeded categories
```

---

## Phase 2: Transactions — ⏳ AWAITING APPROVAL

### Proposed Scope
- Wallet CRUD (cash / bank / card / e-wallet types)
- Transaction CRUD (income / expense / transfer)
- Atomic wallet balance recalculation (`$transaction` for every change)
- Transfer: debits from-wallet, credits to-wallet, excluded from P&L
- Transaction list endpoint with filters: date range, type, category, wallet
- Pagination (cursor or offset)
- Frontend: Transaction list page, Add/Edit transaction modal/page

---

## Phases 3–7 — Not started
3. Calendar view
4. Statistics & charts
5. Budget module
6. Goals, Debt tracker, Recurring transactions
7. File attachments, Settings, Polish
