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

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5 |
| Styling | Tailwind CSS, Glass morphism UI |
| Charts | Recharts |
| Backend | NestJS, Prisma ORM |
| Database | MySQL |
| Auth | JWT (access + refresh tokens) |
| Deployment | Vercel (frontend) + Railway (backend + DB) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for local MySQL)

### 1. Clone the repo
```bash
git clone https://github.com/asifahsaan/money-manager-web-app.git
cd money-manager-web-app
```

### 2. Start local database
```bash
docker-compose up -d
```

### 3. Setup backend
```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL and JWT_SECRET in .env
npx prisma migrate deploy
npm install
npm run start:dev
```

### 4. Setup frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` — Backend API at `http://localhost:3001`.

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
│   └── prisma/        # Database schema & migrations
└── docker-compose.yml # Local development database
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [money-manager-web-app.vercel.app](https://money-manager-web-app.vercel.app) |
| Backend API | Railway | `money-manager-web-app-production.up.railway.app` |
| Database | Railway MySQL | Managed MySQL 9.4 |

---

## 📸 Screenshots

| Transactions | Statistics | Wallet |
|---|---|---|
| Month view with sidebar | Donut charts + breakdowns | Budgets, Goals, Debts |

---

## 📄 License

MIT © [Asif Ahsaan](https://github.com/asifahsaan)
