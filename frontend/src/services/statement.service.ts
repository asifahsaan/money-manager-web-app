import apiClient from '@/lib/axios';
import type { ApiResponse, TransactionType } from '@/types';

export interface StatementRow {
  id: number;
  date: string;
  time: string | null;
  description: string;
  category: string | null;
  wallet: string;
  type: TransactionType;
  debit: string;
  credit: string;
  balance: string;
}

export interface Statement {
  accountName: string;
  currency: string;
  holderName: string;
  holderEmail: string;
  scope: { walletId: number | null; label: string; wallets: string[] };
  period: { startDate: string; endDate: string };
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  rows: StatementRow[];
  generatedAt: string;
}

export const statementService = {
  async get(params: { accountId: number; walletId?: number; startDate: string; endDate: string }): Promise<Statement> {
    const res = await apiClient.get<ApiResponse<Statement>>('/statements', { params });
    return res.data.data;
  },
};
