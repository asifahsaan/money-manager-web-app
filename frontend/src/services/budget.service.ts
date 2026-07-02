import apiClient from '@/lib/axios';
import { ApiResponse, Budget } from '@/types';

export const budgetService = {
  getAll: (accountId: number, startDate?: string, endDate?: string) => {
    const params: Record<string, string | number> = { accountId };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get<ApiResponse<Budget[]>>('/budgets', { params }).then((r) => r.data.data);
  },

  create: (data: {
    accountId: number;
    categoryId: number;
    amount: number;
    periodType: string;
    startDate: string;
    endDate: string;
  }) => apiClient.post<ApiResponse<Budget>>('/budgets', data).then((r) => r.data.data),

  update: (id: number, data: { amount?: number; startDate?: string; endDate?: string }) =>
    apiClient.patch<ApiResponse<Budget>>(`/budgets/${id}`, data).then((r) => r.data.data),

  delete: (id: number) => apiClient.delete(`/budgets/${id}`).then((r) => r.data),
};
