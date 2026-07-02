import apiClient from '@/lib/axios';
import { ApiResponse, TransactionAttachment } from '@/types';

export const attachmentService = {
  async list(transactionId: number): Promise<TransactionAttachment[]> {
    const res = await apiClient.get<ApiResponse<TransactionAttachment[]>>(
      `/transactions/${transactionId}/attachments`,
    );
    return res.data.data;
  },

  async upload(transactionId: number, file: File): Promise<TransactionAttachment> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<ApiResponse<TransactionAttachment>>(
      `/transactions/${transactionId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data;
  },

  async delete(transactionId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/transactions/${transactionId}/attachments/${attachmentId}`);
  },
};
