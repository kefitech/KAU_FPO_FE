import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { API_CONFIG } from "@/lib/constants/app";

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // sends HttpOnly cookies automatically on every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach X-Language header (priority #2 after ?lang= query param)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("locale-storage");
      const parsed: string = stored ? (JSON.parse(stored)?.state?.locale ?? "") : "";
      const locale = parsed || "en";
      config.headers["X-Language"] = locale;
    } catch {
      config.headers["X-Language"] = "en";
    }
  }
  return config;
});

// Token refresh state — shared across all concurrent requests
let isRefreshing = false;
type QueueEntry = { resolve: (value: unknown) => void; reject: (reason: unknown) => void };
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(undefined);
    }
  });
  failedQueue = [];
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.location.href = "/v1/login";
}

const PUBLIC_AUTH_PATHS = [
  "/v1/login",
  "/v1/register",
  "/register",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
];

function isOnAuthPage() {
  if (typeof window === "undefined") return false;
  return PUBLIC_AUTH_PATHS.some(
    (p) => window.location.pathname === p || window.location.pathname.startsWith(`${p}/`),
  );
}

// Response interceptor — attempt token refresh on 401 before redirecting to login
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Network error (no response from server)
    if (!error.response) {
      const isConnectionRefused =
        error.code === "ERR_NETWORK" ||
        error.code === "ERR_CONNECTION_REFUSED" ||
        error.message?.toLowerCase().includes("network");

      return Promise.reject(
        new Error(
          isConnectionRefused
            ? "Server is currently unavailable. Please try again later."
            : "Unable to reach the server. Please check your connection.",
        ),
      );
    }

    if (error.response.status === 401) {
      // Don't refresh if: already on login page, or this IS the refresh request, or already retried
      const isRefreshEndpoint = originalRequest.url?.includes("/auth/token/refresh/");
      if (isOnAuthPage() || isRefreshEndpoint || originalRequest._retry) {
        return Promise.reject(buildRejected(error));
      }

      if (isRefreshing) {
        // Queue this request — it will be retried after the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest))
          .catch(() => Promise.reject(buildRejected(error)));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the refresh endpoint — Django reads the HttpOnly refresh cookie and
        // sets new access + refresh cookies in the response
        await apiClient.post("/auth/token/refresh/");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        redirectToLogin();
        return new Promise(() => {
          // Hang the promise — navigation is in progress
        });
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(buildRejected(error));
  },
);

function buildRejected(error: AxiosError) {
  return {
    message: (error.response?.data as Record<string, unknown>)?.message || error.message || "An error occurred",
    status: error.response?.status,
    data: error.response?.data,
  };
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<{ data: T; status: number }> {
  const response = await apiClient(config);
  return { data: response.data, status: response.status };
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiRequest<T>({ method: "GET", url, ...config }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: "POST", url, data, ...config }),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: "PUT", url, data, ...config }),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiRequest<T>({ method: "PATCH", url, data, ...config }),

  delete: <T>(url: string, config?: AxiosRequestConfig) => apiRequest<T>({ method: "DELETE", url, ...config }),
};

// ── Public API client — no cookies sent (for open endpoints like registration) ──

export const publicApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: false, // never sends session cookies — avoids 401 on AllowAny views
  headers: {
    "Content-Type": "application/json",
  },
});

publicApiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("locale-storage");
      const locale = stored ? (JSON.parse(stored)?.state?.locale ?? "en") : "en";
      config.headers["X-Language"] = locale || "en";
    } catch {
      config.headers["X-Language"] = "en";
    }
  }
  return config;
});

async function publicApiRequest<T>(config: AxiosRequestConfig): Promise<{ data: T; status: number }> {
  const response = await publicApiClient(config);
  return { data: response.data, status: response.status };
}

export const publicApi = {
  get: <T>(url: string, config?: AxiosRequestConfig) => publicApiRequest<T>({ method: "GET", url, ...config }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    publicApiRequest<T>({ method: "POST", url, data, ...config }),
};
