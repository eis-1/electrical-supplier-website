import apiClient from './api';
import type { ApiResponse, Category } from '@/types';

export const categoryService = {
  // Get all categories
  async getAll(includeInactive?: boolean): Promise<Category[]> {
    const params = includeInactive ? { includeInactive: true } : {};
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories', { params });
    return response.data.data;
  },

  // Get category by ID
  async getById(id: string): Promise<Category> {
    const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data.data;
  },

  // Create category (Admin)
  async create(data: Partial<Category>): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return response.data.data;
  },

  // Update category (Admin)
  async update(id: string, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return response.data.data;
  },

  // Delete category (Admin)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
