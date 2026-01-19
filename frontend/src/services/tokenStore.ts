// Centralized, memory-only token store.
// This breaks circular deps between apiClient (interceptors) and authService.

let memoryToken: string | null = null;

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
