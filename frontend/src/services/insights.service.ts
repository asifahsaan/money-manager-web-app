import apiClient from '@/lib/axios';
import { ApiResponse, TransactionType } from '@/types';

export interface WalletForecast {
  walletId: number;
  name: string;
  includedInTotal: boolean;
  current: number;
  recurringIn: number;
  recurringOut: number;
  dailySpend: number;
  expectedSpending: number;
  projected: number;
  lowest: number;
  lowestDate: string;
  negativeOn: string | null;
}

export interface Forecast {
  asOf: string;
  monthEnd: string;
  daysLeft: number;
  historyDays: number;
  wallets: WalletForecast[];
  total: { current: number; projected: number; recurringIn: number; recurringOut: number; expectedSpending: number };
  tips: { walletId: number; need: number; fromWalletId: number | null; fromName: string | null }[];
}

export interface EntrySuggestion {
  description: string;
  type: TransactionType;
  categoryId: number | null;
  categoryLabel: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  walletId: number | null;
  walletName: string | null;
  amount: number;
  count: number;
  lastDate: string;
}

export const insightsService = {
  forecast: (accountId: number) =>
    apiClient.get<ApiResponse<Forecast>>('/insights/forecast', { params: { accountId } }).then((r) => r.data.data),

  suggestions: (accountId: number, q: string, type?: TransactionType) =>
    apiClient
      .get<ApiResponse<EntrySuggestion[]>>('/insights/suggestions', { params: { accountId, q, ...(type && type !== 'TRANSFER' && { type }) } })
      .then((r) => r.data.data),
};
