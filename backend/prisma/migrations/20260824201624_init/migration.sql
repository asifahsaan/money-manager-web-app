-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalEntryType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'PARTIAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "DebtEntryType" AS ENUM ('PAYMENT', 'COLLECTION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "defaultCurrency" VARCHAR(10) NOT NULL DEFAULT 'Rs.',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'Rs.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'CASH',
    "icon" VARCHAR(100),
    "color" VARCHAR(20),
    "initialBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "includedInTotal" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" VARCHAR(100),
    "color" VARCHAR(20),
    "parentCategoryId" INTEGER,
    "description" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" DATE NOT NULL,
    "time" VARCHAR(8),
    "datetime" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(255),
    "memo" TEXT,
    "categoryId" INTEGER,
    "walletId" INTEGER,
    "fromWalletId" INTEGER,
    "toWalletId" INTEGER,
    "feeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "recurringId" INTEGER,
    "debtId" INTEGER,
    "goalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_attachments" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "periodType" "PeriodType" NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "savedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "goalDate" DATE NOT NULL,
    "walletId" INTEGER,
    "icon" VARCHAR(100),
    "color" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_entries" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "type" "GoalEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "walletId" INTEGER,
    "transactionId" INTEGER,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "type" "DebtType" NOT NULL,
    "personName" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(18,2) NOT NULL,
    "walletId" INTEGER,
    "color" VARCHAR(20),
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_entries" (
    "id" SERIAL NOT NULL,
    "debtId" INTEGER NOT NULL,
    "type" "DebtEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "walletId" INTEGER,
    "transactionId" INTEGER,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrings" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" VARCHAR(255),
    "memo" TEXT,
    "categoryId" INTEGER,
    "walletId" INTEGER,
    "fromWalletId" INTEGER,
    "toWalletId" INTEGER,
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" DATE NOT NULL,
    "nextOccurrence" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "wallets_accountId_idx" ON "wallets"("accountId");

-- CreateIndex
CREATE INDEX "wallets_accountId_archived_idx" ON "wallets"("accountId", "archived");

-- CreateIndex
CREATE INDEX "categories_accountId_type_idx" ON "categories"("accountId", "type");

-- CreateIndex
CREATE INDEX "categories_parentCategoryId_idx" ON "categories"("parentCategoryId");

-- CreateIndex
CREATE INDEX "transactions_accountId_date_idx" ON "transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "transactions_accountId_type_idx" ON "transactions"("accountId", "type");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_fromWalletId_idx" ON "transactions"("fromWalletId");

-- CreateIndex
CREATE INDEX "transactions_toWalletId_idx" ON "transactions"("toWalletId");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transaction_attachments_transactionId_idx" ON "transaction_attachments"("transactionId");

-- CreateIndex
CREATE INDEX "budgets_accountId_idx" ON "budgets"("accountId");

-- CreateIndex
CREATE INDEX "budgets_categoryId_idx" ON "budgets"("categoryId");

-- CreateIndex
CREATE INDEX "goals_accountId_idx" ON "goals"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_entries_transactionId_key" ON "goal_entries"("transactionId");

-- CreateIndex
CREATE INDEX "goal_entries_goalId_idx" ON "goal_entries"("goalId");

-- CreateIndex
CREATE INDEX "debts_accountId_type_idx" ON "debts"("accountId", "type");

-- CreateIndex
CREATE INDEX "debts_accountId_status_idx" ON "debts"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "debt_entries_transactionId_key" ON "debt_entries"("transactionId");

-- CreateIndex
CREATE INDEX "debt_entries_debtId_idx" ON "debt_entries"("debtId");

-- CreateIndex
CREATE INDEX "recurrings_accountId_idx" ON "recurrings"("accountId");

-- CreateIndex
CREATE INDEX "recurrings_accountId_isActive_idx" ON "recurrings"("accountId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "settings_userId_key_key" ON "settings"("userId", "key");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurrings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrings" ADD CONSTRAINT "recurrings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrings" ADD CONSTRAINT "recurrings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrings" ADD CONSTRAINT "recurrings_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrings" ADD CONSTRAINT "recurrings_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrings" ADD CONSTRAINT "recurrings_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
