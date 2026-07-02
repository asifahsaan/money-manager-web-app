import apiClient from '@/lib/axios';
import { ApiResponse, Wallet } from '@/types';

export const walletService = {
  async list(accountId: number): Promise<Wallet[]> {
    const res = await apiClient.get<ApiResponse<Wallet[]>>('/wallets', {
      params: { accountId },
    });
    return res.data.data;
  },

  async get(id: number): Promise<Wallet> {
    const res = await apiClient.get<ApiResponse<Wallet>>(`/wallets/${id}`);
    return res.data.data;
  },

  async create(data: {
    accountId: number;
    name: string;
    type?: string;
    icon?: string;
    color?: string;
    initialBalance?: number;
    includedInTotal?: boolean;
  }): Promise<Wallet> {
    const res = await apiClient.post<ApiResponse<Wallet>>('/wallets', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<{
    name: string;
    type: string;
    icon: string;
    color: string;
    initialBalance: number;
    includedInTotal: boolean;
    archived: boolean;
  }>): Promise<Wallet> {
    const res = await apiClient.patch<ApiResponse<Wallet>>(`/wallets/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/wallets/${id}`);
  },
};
