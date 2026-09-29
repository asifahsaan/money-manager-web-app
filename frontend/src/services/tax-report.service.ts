import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types';

export type TaxPeriodType = 'tax' | 'calendar';

export interface HeadTotal {
  head: string;
  label: string;
  total: string;
  categories: { id: number | null; name: string; total: string; count: number }[];
}

export interface WealthSnapshot {
  wallets: { id: number; name: string; amount: string }[];
  walletsTotal: string;
  goals: string;
  receivables: string;
  payables: string;
  net: string;
}

export interface AuditItem {
  kind: 'transaction' | 'debt' | 'wallet';
  id: number;
  date?: string;
  label: string;
  amount?: string;
}

export interface AuditFinding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  items: AuditItem[];
}

export interface HeadMapping {
  categoryId: number;
  name: string;
  parent: string | null;
  type: 'INCOME' | 'EXPENSE';
  head: string;
  custom: boolean;
}

export interface TaxReport {
  period: { type: TaxPeriodType; year: number; label: string; startDate: string; endDate: string };
  holderName: string;
  holderEmail: string;
  accountName: string;
  currency: string;
  generatedAt: string;
  income: { total: string; heads: HeadTotal[] };
  expenses: { total: string; heads: HeadTotal[] };
  wealth: {
    opening: WealthSnapshot;
    closing: WealthSnapshot;
    lines: { key: string; label: string; amount: string }[];
    expectedClosing: string;
    actualClosing: string;
    residual: string;
  };
  audit: { errors: number; warnings: number; infos: number; findings: AuditFinding[] };
  transactions: { id: number; date: string; type: string; head: string; category: string; wallet: string; description: string; amount: string }[];
  mapping: HeadMapping[];
}

export const taxReportService = {
  async get(accountId: number, period: TaxPeriodType, year: number): Promise<TaxReport> {
    const res = await apiClient.get<ApiResponse<TaxReport>>('/tax-report', { params: { accountId, period, year } });
    return res.data.data;
  },
  async saveMapping(accountId: number, heads: Record<number, string>): Promise<HeadMapping[]> {
    const res = await apiClient.put<ApiResponse<HeadMapping[]>>('/tax-report/mapping', { accountId, heads });
    return res.data.data;
  },
};
