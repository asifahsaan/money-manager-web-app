import apiClient from '@/lib/axios';
import { ApiResponse, Category, CategoryType } from '@/types';

export interface CreateCategoryData {
  accountId: number;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentCategoryId?: number;
  description?: string;
}

export const categoryService = {
  async list(accountId: number, type?: CategoryType): Promise<Category[]> {
    const res = await apiClient.get<ApiResponse<Category[]>>('/categories', {
      params: { accountId, ...(type && { type }) },
    });
    return res.data.data;
  },

  async create(data: CreateCategoryData): Promise<Category> {
    const res = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<Omit<CreateCategoryData, 'accountId' | 'type'>>): Promise<Category> {
    const res = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
