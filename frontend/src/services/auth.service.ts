import apiClient from '@/lib/axios';
import type { ApiResponse, AuthResponse, User } from '@/types';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      data,
    );
    return res.data;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      data,
    );
    return res.data;
  },

  async me(): Promise<ApiResponse<User>> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};
