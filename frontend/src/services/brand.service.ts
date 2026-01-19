import apiClient from "./api";
import type { ApiResponse, Brand } from "@/types";

export const brandService = {
  // Get all brands
  async getAll(includeInactive?: boolean): Promise<Brand[]> {
    const params = includeInactive ? { includeInactive: true } : {};
    const response = await apiClient.get<ApiResponse<Brand[]>>("/brands", {
      params,
    });
    return response.data.data;
  },

  // Get brand by ID
  async getById(id: string): Promise<Brand> {
    const response = await apiClient.get<ApiResponse<Brand>>(`/brands/${id}`);
    return response.data.data;
  },

  // Create brand (Admin)
  async create(data: Partial<Brand>): Promise<Brand> {
    const response = await apiClient.post<ApiResponse<Brand>>("/brands", data);
    return response.data.data;
  },

  // Update brand (Admin)
  async update(id: string, data: Partial<Brand>): Promise<Brand> {
    const response = await apiClient.put<ApiResponse<Brand>>(
      `/brands/${id}`,
      data,
    );
    return response.data.data;
  },

  // Delete brand (Admin)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/brands/${id}`);
  },
};
