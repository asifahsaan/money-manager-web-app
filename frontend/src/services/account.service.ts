import apiClient from '@/lib/axios';
import type { Account, ApiResponse } from '@/types';

export const accountService = {
  async list(): Promise<ApiResponse<Account[]>> {
    const res = await apiClient.get<ApiResponse<Account[]>>('/accounts');
    return res.data;
  },

  async get(id: number): Promise<ApiResponse<Account>> {
    const res = await apiClient.get<ApiResponse<Account>>(`/accounts/${id}`);
    return res.data;
  },

  async create(data: {
    name: string;
    currency?: string;
  }): Promise<ApiResponse<Account>> {
    const res = await apiClient.post<ApiResponse<Account>>('/accounts', data);
    return res.data;
  },

  async update(
    id: number,
    data: { name?: string; currency?: string },
  ): Promise<ApiResponse<Account>> {
    const res = await apiClient.patch<ApiResponse<Account>>(
      `/accounts/${id}`,
      data,
    );
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/accounts/${id}`);
  },
};
