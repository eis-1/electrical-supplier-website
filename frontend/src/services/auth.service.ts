import apiClient from './api';
import type { ApiResponse, LoginCredentials, AuthResponse } from '@/types';

// Memory-only token storage (XSS-safe)
let memoryToken: string | null = null;

export const authService = {
  // Get token from memory (used by api interceptor)
  getToken(): string | null {
    return memoryToken;
  },

  // Set token in memory only
  setToken(token: string | null): void {
    memoryToken = token;
  },

  // Login (refresh token stored in HttpOnly cookie by backend)
  async login(credentials: LoginCredentials): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/auth/login', credentials);
    const data = response.data.data;
    
    // If 2FA is required, return response with flag (don't store token yet)
    if (data.requiresTwoFactor) {
      return data; // Returns { requiresTwoFactor: true, admin: {...} }
    }
    
    // Store access token in memory only (XSS-safe)
    const { token } = data;
    memoryToken = token;

    // Persist admin user (used by admin route guards/UI)
    if (data.admin) {
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
    }
    
    return data;
  },

  // Verify 2FA code after login
  async verify2FA(adminId: string, code: string): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/verify-2fa', {
      adminId,
      code,
    });
    const { token } = response.data.data;
    
    // Store access token in memory only (XSS-safe)
    memoryToken = token;

    if ((response.data.data as any).admin) {
      localStorage.setItem('adminUser', JSON.stringify((response.data.data as any).admin));
    }
    
    return response.data.data;
  },

  // Verify token and return decoded admin info (or null if invalid)
  async verifyToken(): Promise<any | null> {
    try {
      const response = await apiClient.post<ApiResponse<{ valid: boolean; admin: any }>>('/auth/verify');
      return response.data.data.admin ?? null;
    } catch {
      return null;
    }
  },

  // Refresh access token using HttpOnly cookie
  async refreshToken(): Promise<string | null> {
    try {
      const response = await apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh');
      const { token } = response.data.data;
      
      // Update token in memory only
      memoryToken = token;
      
      return token;
    } catch {
      // Refresh failed, user needs to login again
      this.logout();
      return null;
    }
  },

  // Logout (clears memory token and HttpOnly cookie via API call)
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      memoryToken = null;
      localStorage.removeItem('adminUser');
      sessionStorage.clear(); // Clear CSRF token too
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!memoryToken;
  },
};
