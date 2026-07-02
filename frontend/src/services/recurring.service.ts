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
    startDate: string;
    endDate?: string;
  }) => apiClient.post<ApiResponse<Recurring>>('/recurrings', data).then((r) => r.data.data),

  update: (id: number, data: Partial<{ amount: number; description: string; memo: string; categoryId: number; frequency: RecurringFrequency; endDate: string; isActive: boolean }>) =>
    apiClient.patch<ApiResponse<Recurring>>(`/recurrings/${id}`, data).then((r) => r.data.data),

  execute: (id: number) =>
    apiClient.post(`/recurrings/${id}/execute`).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/recurrings/${id}`).then((r) => r.data),
};
