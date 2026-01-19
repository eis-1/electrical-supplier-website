import axios, { AxiosInstance, AxiosError } from "axios";
import { tokenStore } from "./tokenStore";

// Use relative URL so it works on the same port as the backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const CSRF_STORAGE_KEY = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enable sending/receiving cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach CSRF token (used by refresh/logout endpoints that rely on cookies)
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

// Response interceptor - Handle errors globally with auto-refresh
apiClient.interceptors.response.use(
  (response) => {
    // Capture CSRF token from response header (if present)
    const csrfToken = (response.headers as any)?.[CSRF_HEADER_NAME];
    if (csrfToken && typeof csrfToken === "string") {
      sessionStorage.setItem(CSRF_STORAGE_KEY, csrfToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 error and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token using the HttpOnly cookie
        const csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
          },
        );

        const { token } = refreshResponse.data.data;

        // Update CSRF token if backend rotated it
        const newCsrfToken = (refreshResponse.headers as any)?.[
          CSRF_HEADER_NAME
        ];
        if (newCsrfToken && typeof newCsrfToken === "string") {
          sessionStorage.setItem(CSRF_STORAGE_KEY, newCsrfToken);
        }

        // Update token in memory only
        tokenStore.setToken(token);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and optionally redirect to login
        tokenStore.setToken(null);
        localStorage.removeItem("adminUser");
        sessionStorage.removeItem(CSRF_STORAGE_KEY);
        // window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
