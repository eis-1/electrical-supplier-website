import apiClient from './api';
import type { ApiResponse, QuoteRequest } from '@/types';

export const quoteService = {
  // Submit quote request (Public)
  async submit(data: QuoteRequest): Promise<{ id: string; referenceNumber: string }> {
    const response = await apiClient.post<ApiResponse<{ id: string; referenceNumber: string }>>(
      '/quotes',
      data
    );
    return response.data.data;
  },

  // Get all quotes (Admin)
  async getAll(filters?: { status?: string; page?: number; limit?: number }) {
    const response = await apiClient.get('/quotes', { params: filters });
    return response.data.data;
  },

  // Get quote by ID (Admin)
  async getById(id: string) {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data.data;
  },

  // Update quote (Admin)
  async update(id: string, data: { status?: string; notes?: string }) {
    const response = await apiClient.put(`/quotes/${id}`, data);
    return response.data.data;
  },
};
