import axios, { AxiosInstance, AxiosError } from "axios";
import { tokenStore } from "./tokenStore";

/**
 * API Client - Centralized Axios instance for all API calls
 *
 * Features:
 * - Automatic JWT token attachment to requests
 * - Automatic token refresh on 401 errors
 * - CSRF token management for cookie-based endpoints
 * - Global error handling
 * - Request/response interceptors
 *
 * Authentication Strategy:
 * - Access Token: Stored in memory (tokenStore), sent in Authorization header
 * - Refresh Token: Stored in HttpOnly cookie, automatically sent by browser
 * - CSRF Token: Stored in sessionStorage, sent in x-csrf-token header
 *
 * Auto-Refresh Flow:
 * 1. API request returns 401 (token expired)
 * 2. Interceptor catches 401 error
 * 3. Calls /auth/refresh with refresh token cookie
 * 4. Backend validates refresh token and issues new access token
 * 5. Updates token in memory
 * 6. Retries original request with new token
 * 7. If refresh fails: Clear tokens and redirect to login
 *
 * CSRF Protection:
 * - Backend sends CSRF token in x-csrf-token header
 * - Frontend stores in sessionStorage
 * - Attaches to requests that use cookies (refresh, logout)
 * - Prevents CSRF attacks on cookie-based operations
 *
 * Configuration:
 * - Base URL: VITE_API_BASE_URL env var or "/api/v1" (default)
 * - Timeout: 10 seconds (prevents hanging requests)
 * - withCredentials: true (enables cookie sending/receiving)
 *
 * Usage:
 * @example
 * import api from './services/api';
 *
 * // GET request
 * const response = await api.get('/products');
 *
 * // POST request
 * const response = await api.post('/quotes', quoteData);
 *
 * // Authenticated request (token added automatically)
 * const response = await api.get('/admin/products');
 */

// Base URL configuration - supports environment override
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// CSRF token configuration for cookie-based operations
const CSRF_STORAGE_KEY = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Create configured Axios instance
 *
 * Configuration:
 * - baseURL: API base path (e.g., /api/v1)
 * - timeout: 10 seconds max per request
 * - withCredentials: true (enables HttpOnly cookie handling)
 * - Content-Type: application/json (default for all requests)
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout prevents hanging
  withCredentials: true, // Enable sending/receiving HttpOnly cookies (refresh token)
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor - Runs before every API request
 *
 * Responsibilities:
 * 1. Attach JWT access token from memory to Authorization header
 * 2. Attach CSRF token from sessionStorage to x-csrf-token header
 *
 * Token Sources:
 * - Access Token: tokenStore (memory) → Authorization: Bearer <token>
 * - CSRF Token: sessionStorage → x-csrf-token: <token>
 *
 * Why Two Tokens:
 * - Access Token: Validates API requests, short-lived (24h)
 * - CSRF Token: Protects cookie-based operations from CSRF attacks
 */
apiClient.interceptors.request.use(
  (config) => {
    // Attach JWT access token if available
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach CSRF token for endpoints using cookies (refresh, logout)
    const csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (csrfToken) {
      (config.headers as any)[CSRF_HEADER_NAME] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor - Runs after every API response
 *
 * Responsibilities:
 * 1. Capture CSRF tokens from response headers
 * 2. Handle 401 errors with automatic token refresh
 * 3. Retry failed requests after successful token refresh
 *
 * Auto-Refresh Logic:
 * - Detects 401 Unauthorized responses
 * - Attempts token refresh using refresh token cookie
 * - Retries original request on success
 * - Clears session and redirects on failure
 *
 * CSRF Token Rotation:
 * - Backend may send new CSRF token on refresh
 * - Automatically captured and stored
 * - Used for subsequent requests
 */
apiClient.interceptors.response.use(
  (response) => {
    // Capture CSRF token from response header (if present)
    // Backend sends this on login, refresh, and other operations
    const csrfToken = (response.headers as any)?.[CSRF_HEADER_NAME];
    if (csrfToken && typeof csrfToken === "string") {
      sessionStorage.setItem(CSRF_STORAGE_KEY, csrfToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // AUTOMATIC TOKEN REFRESH LOGIC
    // If 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Prevent infinite retry loop

      try {
        // Attempt to refresh access token using refresh token cookie
        // The HttpOnly cookie is automatically sent by the browser
        const csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {}, // No body needed, refresh token is in cookie
          {
            withCredentials: true, // Send refresh token cookie
            headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
          },
        );

        const { token } = refreshResponse.data.data;

        // Update CSRF token if backend rotated it (security best practice)
        const newCsrfToken = (refreshResponse.headers as any)?.[
          CSRF_HEADER_NAME
        ];
        if (newCsrfToken && typeof newCsrfToken === "string") {
          sessionStorage.setItem(CSRF_STORAGE_KEY, newCsrfToken);
        }

        // Update access token in memory (tokenStore)
        tokenStore.setToken(token);

        // Retry the original request with new access token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - likely refresh token expired or invalid
        // Clear all auth data and redirect to login
        tokenStore.setToken(null);
        localStorage.removeItem("adminUser");
        sessionStorage.removeItem(CSRF_STORAGE_KEY);
        // Optional: Uncomment to auto-redirect to login
        // window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    // For non-401 errors or after failed refresh, reject normally
    return Promise.reject(error);
  },
);

export default apiClient;
