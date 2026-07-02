import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface SubCategoryItem {
  id: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
}

export interface TransactionItem {
  id: number;
  date: string;
  amount: number;
  description: string | null;
}

export interface CategoryBreakdownItem {
  id: number | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
  subCategories: SubCategoryItem[];
  transactions: TransactionItem[];
}

export interface StatsSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseBreakdown: CategoryBreakdownItem[];
  incomeBreakdown: CategoryBreakdownItem[];
}

export interface TrendMonth {
  month: string; // yyyy-MM
  income: number;
  expense: number;
}

export const statisticsService = {
  async getSummary(accountId: number, startDate: string, endDate: string): Promise<StatsSummary> {
    const res = await apiClient.get<ApiResponse<StatsSummary>>('/statistics/summary', {
      params: { accountId, startDate, endDate },
    });
    return res.data.data;
  },

  async getTrend(accountId: number, months = 6): Promise<TrendMonth[]> {
    const res = await apiClient.get<ApiResponse<TrendMonth[]>>('/statistics/trend', {
      params: { accountId, months },
    });
    return res.data.data;
  },
};
