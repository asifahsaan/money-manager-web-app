import apiClient from '@/lib/axios';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  userGrowthPct: number | null;
  totalTransactions: number;
  txThisMonth: number;
  totalExpenseVolume: number;
  expenseVolumeThisMonth: number;
  totalWallets: number;
  totalAccounts: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  isActive: boolean;
  createdAt: string;
  defaultCurrency: string;
  txCount: number;
  lastActivity: string | null;
  _count: { accounts: number };
}

export interface GrowthPoint { month: string; users: number; cumulative: number }
export interface TrendPoint { month: string; income: number; expense: number; count: number }
export interface TopCategory { category: { id: number; name: string; icon: string | null; color: string | null } | null; totalAmount: number; txCount: number }

export const adminService = {
  getStats: () => apiClient.get<{ data: AdminStats }>('/admin/stats').then(r => r.data.data),

  getUsers: (search?: string, page = 1, limit = 20) =>
    apiClient.get<{ data: { users: AdminUser[]; total: number; pages: number } }>('/admin/users', {
      params: { search, page, limit },
    }).then(r => r.data.data),

  getUser: (id: number) => apiClient.get<{ data: AdminUser }>(`/admin/users/${id}`).then(r => r.data.data),

  updateUser: (id: number, data: { role?: string; isActive?: boolean }) =>
    apiClient.patch<{ data: AdminUser }>(`/admin/users/${id}`, data).then(r => r.data.data),

  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`).then(r => r.data),

  getUserGrowth: (months = 12) =>
    apiClient.get<{ data: GrowthPoint[] }>('/admin/reports/growth', { params: { months } }).then(r => r.data.data),

  getTransactionTrend: (months = 6) =>
    apiClient.get<{ data: TrendPoint[] }>('/admin/reports/transactions', { params: { months } }).then(r => r.data.data),

  getTopCategories: (limit = 10) =>
    apiClient.get<{ data: TopCategory[] }>('/admin/reports/categories', { params: { limit } }).then(r => r.data.data),
};
