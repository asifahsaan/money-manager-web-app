import apiClient from '@/lib/axios';
import { ApiResponse, Goal } from '@/types';

export const goalService = {
  getAll: (accountId: number) =>
    apiClient.get<ApiResponse<Goal[]>>('/goals', { params: { accountId } }).then((r) => r.data.data),

  getOne: (id: number) => apiClient.get<ApiResponse<Goal>>(`/goals/${id}`).then((r) => r.data.data),

  create: (data: {
    accountId: number;
    name: string;
    targetAmount: number;
    goalDate: string;
    walletId?: number;
    icon?: string;
    color?: string;
  }) => apiClient.post<ApiResponse<Goal>>('/goals', data).then((r) => r.data.data),

  update: (id: number, data: Partial<{ name: string; targetAmount: number; goalDate: string; walletId: number; icon: string; color: string }>) =>
    apiClient.patch<ApiResponse<Goal>>(`/goals/${id}`, data).then((r) => r.data.data),

  deposit: (id: number, data: { amount: number; walletId: number; date: string; note?: string }) =>
    apiClient.post<ApiResponse<Goal>>(`/goals/${id}/deposit`, data).then((r) => r.data.data),

  withdraw: (id: number, data: { amount: number; walletId: number; date: string; note?: string }) =>
    apiClient.post<ApiResponse<Goal>>(`/goals/${id}/withdraw`, data).then((r) => r.data.data),

  delete: (id: number) => apiClient.delete(`/goals/${id}`).then((r) => r.data),
};
