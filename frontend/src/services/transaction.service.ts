import apiClient from '@/lib/axios';
import {
  ApiResponse,
  CreateTransactionData,
  PaginatedTransactions,
  Transaction,
  TransactionFilters,
} from '@/types';

export const transactionService = {
  async list(filters: TransactionFilters): Promise<PaginatedTransactions> {
    const res = await apiClient.get<ApiResponse<PaginatedTransactions>>('/transactions', {
      params: filters,
    });
    return res.data.data;
  },

  async get(id: number): Promise<Transaction> {
    const res = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return res.data.data;
  },

  async create(data: CreateTransactionData): Promise<Transaction> {
    const res = await apiClient.post<ApiResponse<Transaction>>('/transactions', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreateTransactionData>): Promise<Transaction> {
    const res = await apiClient.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },

  async exportCsv(filters: TransactionFilters): Promise<void> {
    const res = await apiClient.get('/transactions/export', {
      params: filters,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
