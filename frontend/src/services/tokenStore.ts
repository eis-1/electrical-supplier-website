/**
 * Token Store Module
 *
 * Centralized, memory-only JWT token storage for the React application.
 *
 * **Problem Solved:**
 * Breaks circular dependency between apiClient and authService:
 * - apiClient needs token for Authorization header in interceptor
 * - authService uses apiClient to call login endpoint
 * - Direct import creates circular dependency
 *
 * **Solution:**
 * This module acts as a neutral third-party store that both modules can import
 * without creating circular dependencies.
 *
 * **Storage Strategy:**
 * - Memory-only (not localStorage) - clears on page refresh
 * - Simple get/set/clear interface
 * - No persistence to avoid XSS token theft from localStorage
 *
 * **Security Note:**
 * Token stored in memory is safer than localStorage (not accessible to XSS),
 * but means user must re-login on page refresh. This is acceptable tradeoff
 * for security-critical admin application.
 *
 * **Usage:**
 * - authService sets token after successful login
 * - apiClient reads token in request interceptor
 * - authService clears token on logout
 */

let memoryToken: string | null = null;

/**
 * Token Store Interface
 *
 * Provides getter/setter/clear operations for JWT token.
 */


export const tokenStore = {
  getToken(): string | null {
    return memoryToken;
  },

  setToken(token: string | null): void {
    memoryToken = token;
  },

  clearToken(): void {
    memoryToken = null;
  },
};
