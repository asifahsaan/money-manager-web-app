import apiClient from '@/lib/axios';
import { ApiResponse, Debt, DebtType } from '@/types';

export type DebtActivityKind = 'LENT' | 'BORROWED' | 'COLLECTED' | 'REPAID';

export interface DebtActivityRow {
  id: string;
  kind: DebtActivityKind;
  direction: 'IN' | 'OUT';
  debtId: number;
  personName: string;
  amount: string;
  walletId: number | null;
  date: string; // YYYY-MM-DD
  note: string | null;
  entryId: number | null;
}

export interface DebtActivityPage {
  data: DebtActivityRow[];
  total: number;
  page: number;
  limit: number;
  totalIn: string;
  totalOut: string;
}

export interface DebtActivityParams {
  accountId: number;
  debtId?: number;
  kind?: DebtActivityKind;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

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
    dueDate?: string;
    contactPhone?: string;
    contactEmail?: string;
  }) => apiClient.post<ApiResponse<Debt>>('/debts', data).then((r) => r.data.data),

  update: (id: number, data: Partial<{ personName: string; description: string; color: string; date: string; totalAmount: number; walletId: number | null; dueDate: string | null; contactPhone: string | null; contactEmail: string | null }>) =>
    apiClient.patch<ApiResponse<Debt>>(`/debts/${id}`, data).then((r) => r.data.data),

  pay: (id: number, data: { amount: number; walletId: number; date: string; note?: string }) =>
    apiClient.post<ApiResponse<Debt>>(`/debts/${id}/pay`, data).then((r) => r.data.data),

  updateEntry: (debtId: number, entryId: number, data: { walletId?: number; note?: string; date?: string }) =>
    apiClient.patch<ApiResponse<Debt>>(`/debts/${debtId}/entries/${entryId}`, data).then((r) => r.data.data),

  activity: (params: DebtActivityParams) =>
    apiClient.get<ApiResponse<DebtActivityPage>>('/debts/activity', { params }).then((r) => r.data.data),

  delete: (id: number) => apiClient.delete(`/debts/${id}`).then((r) => r.data),
};
