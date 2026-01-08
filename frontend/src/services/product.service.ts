import apiClient from './api';
import type { PaginatedResponse, ApiResponse, Product, ProductFilters } from '@/types';

export const productService = {
  // Get all products with filters and pagination
  async getAll(filters?: ProductFilters) {
    const params: any = {};
    
    if (filters?.category) params.category = filters.category;
    if (filters?.brand) params.brand = filters.brand;
    if (filters?.search) params.search = filters.search;
    if (filters?.featured !== undefined) params.featured = filters.featured;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
    return response.data.data;
  },

  // Get product by slug
  async getBySlug(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${slug}`);
    return response.data.data;
  },

  // Create product (Admin)
  async create(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>('/products', data);
    return response.data.data;
  },

  // Update product (Admin)
  async update(id: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data.data;
  },

  // Delete product (Admin)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },
};
