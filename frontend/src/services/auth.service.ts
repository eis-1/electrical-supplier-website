import apiClient from './api';
import type { ApiResponse, LoginCredentials, AuthResponse } from '@/types';

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const { token } = response.data.data;
    
    // Store token in localStorage
    localStorage.setItem('authToken', token);
    
    return response.data.data;
  },

  // Verify token
  async verifyToken(): Promise<boolean> {
    try {
      await apiClient.post('/auth/verify');
      return true;
    } catch {
      return false;
    }
  },

  // Logout
  logout(): void {
    localStorage.removeItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },
};
