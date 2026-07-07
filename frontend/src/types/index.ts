// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  defaultCurrency: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  defaultAccountId?: number;
}

// ─────────────────────────────────────────────
// Account
// ─────────────────────────────────────────────

export interface Account {
  id: number;
  userId: number;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Wallet
// ─────────────────────────────────────────────

export type WalletType = 'CASH' | 'BANK' | 'E_WALLET' | 'CARD' | 'OTHER';

export interface Wallet {
  id: number;
  accountId: number;
  name: string;
  type: WalletType;
  icon: string | null;
  color: string | null;
  initialBalance: string; // Decimal → string in JSON
  currentBalance: string;
  includedInTotal: boolean;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: number;
  accountId: number;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentCategoryId: number | null;
  parent?: Category;
  description: string | null;
  sortOrder: number;
  children?: Category[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Transaction
// ─────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  amount: string; // Decimal → string in JSON
  date: string;
  time: string | null;
  datetime: string;
  description: string | null;
  memo: string | null;
  categoryId: number | null;
  category?: Category;
  walletId: number | null;
  wallet?: Wallet;
  fromWalletId: number | null;
  fromWallet?: Wallet;
  toWalletId: number | null;
  toWallet?: Wallet;
  feeAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionAttachment {
  id: number;
  transactionId: number;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionFilters {
  accountId: number;
  type?: TransactionType;
  categoryId?: number;
  walletId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionData {
  accountId: number;
  type: TransactionType;
  amount: number;
  date: string;
  time?: string;
  description?: string;
  memo?: string;
  categoryId?: number;
  walletId?: number;
  fromWalletId?: number;
  toWalletId?: number;
  feeAmount?: number;
}

// ─────────────────────────────────────────────
// Budget
// ─────────────────────────────────────────────

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface Budget {
  id: number;
  accountId: number;
  categoryId: number;
  category: Category;
  amount: string;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  spent: number;
  remaining: number;
  percentage: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Goal
// ─────────────────────────────────────────────

export type GoalEntryType = 'DEPOSIT' | 'WITHDRAW';

export interface GoalEntry {
  id: number;
  goalId: number;
  type: GoalEntryType;
  amount: string;
  walletId: number | null;
  transactionId: number | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface Goal {
  id: number;
  accountId: number;
  name: string;
  targetAmount: string;
  savedAmount: string;
  goalDate: string;
  walletId: number | null;
  wallet?: Wallet;
  icon: string | null;
  color: string | null;
  entries?: GoalEntry[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Debt
// ─────────────────────────────────────────────

export type DebtType = 'PAYABLE' | 'RECEIVABLE';
export type DebtStatus = 'OPEN' | 'PARTIAL' | 'CLOSED';
export type DebtEntryType = 'PAYMENT' | 'COLLECTION';

export interface DebtEntry {
  id: number;
  debtId: number;
  type: DebtEntryType;
  amount: string;
  walletId: number | null;
  transactionId: number | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface Debt {
  id: number;
  accountId: number;
  type: DebtType;
  personName: string;
  description: string | null;
  totalAmount: string;
  settledAmount: string;
  remainingAmount: string;
  walletId: number | null;
  color: string | null;
  status: DebtStatus;
  date: string;
  entries?: DebtEntry[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Recurring
// ─────────────────────────────────────────────

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface Recurring {
  id: number;
  accountId: number;
  transactionType: TransactionType;
  amount: string;
  description: string | null;
  memo: string | null;
  categoryId: number | null;
  category?: Category;
  walletId: number | null;
  fromWalletId: number | null;
  toWalletId: number | null;
  frequency: RecurringFrequency;
  startDate: string;
  nextOccurrence: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// API Response wrapper
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─────────────────────────────────────────────
// Form types
// ─────────────────────────────────────────────

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}
