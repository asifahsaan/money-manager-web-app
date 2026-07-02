import apiClient from '@/lib/axios';
import type { ApiResponse, User } from '@/types';

export const userService = {
  async updateProfile(data: { name?: string }): Promise<User> {
    const res = await apiClient.patch<ApiResponse<User>>('/users/me', data);
    return res.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/users/me/change-password', { currentPassword, newPassword });
  },
};
