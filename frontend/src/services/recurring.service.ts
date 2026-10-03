import apiClient from '@/lib/axios';
import { ApiResponse, Recurring, TransactionType, RecurringFrequency } from '@/types';

export const recurringService = {
  getAll: (accountId: number) =>
    apiClient.get<ApiResponse<Recurring[]>>('/recurrings', { params: { accountId } }).then((r) => r.data.data),

  create: (data: {
    accountId: number;
    transactionType: TransactionType;
    amount: number;
    description?: string;
    memo?: string;
    categoryId?: number;
    walletId?: number;
    fromWalletId?: number;
    toWalletId?: number;
    frequency: RecurringFrequency;
    weekdays?: number[];
    time?: string;
    startDate: string;
    endDate?: string;
  }) => apiClient.post<ApiResponse<Recurring>>('/recurrings', data).then((r) => r.data.data),

  update: (id: number, data: Partial<{
    amount: number;
    description: string;
    memo: string;
    categoryId: number | null;
    walletId: number | null;
    fromWalletId: number | null;
    toWalletId: number | null;
    frequency: RecurringFrequency;
    weekdays: number[];
    time: string | null;
    nextOccurrence: string;
    endDate: string;
    isActive: boolean;
  }>) =>
    apiClient.patch<ApiResponse<Recurring>>(`/recurrings/${id}`, data).then((r) => r.data.data),

  /** Adds every occurrence that has come due; returns how many were added. */
  processDue: (accountId: number) =>
    apiClient
      .post<ApiResponse<{ created: number }>>('/recurrings/process-due', null, { params: { accountId } })
      .then((r) => r.data.data),

  execute: (id: number) =>
    apiClient.post(`/recurrings/${id}/execute`).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/recurrings/${id}`).then((r) => r.data),
};
