import apiClient from '@/lib/axios';
import { ApiResponse, Debt, DebtType } from '@/types';

export const debtService = {
  getAll: (accountId: number) =>
    apiClient.get<ApiResponse<Debt[]>>('/debts', { params: { accountId } }).then((r) => r.data.data),

  getOne: (id: number) => apiClient.get<ApiResponse<Debt>>(`/debts/${id}`).then((r) => r.data.data),

  create: (data: {
    accountId: number;
    type: DebtType;
    personName: string;
    description?: string;
    totalAmount: number;
    walletId?: number;
    color?: string;
    date: string;
  }) => apiClient.post<ApiResponse<Debt>>('/debts', data).then((r) => r.data.data),

  update: (id: number, data: Partial<{ personName: string; description: string; color: string; date: string; totalAmount: number }>) =>
    apiClient.patch<ApiResponse<Debt>>(`/debts/${id}`, data).then((r) => r.data.data),

  pay: (id: number, data: { amount: number; walletId: number; date: string; note?: string }) =>
    apiClient.post<ApiResponse<Debt>>(`/debts/${id}/pay`, data).then((r) => r.data.data),

  delete: (id: number) => apiClient.delete(`/debts/${id}`).then((r) => r.data),
};
