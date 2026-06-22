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

// Response interceptor — on 401 redirect to login (Django already cleared cookies)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const PUBLIC_AUTH_PATHS = ["/v1/login", "/v1/register", "/forgot-password", "/verify-otp", "/reset-password"];
      const alreadyOnLogin = PUBLIC_AUTH_PATHS.some(
        (p) => window.location.pathname === p || window.location.pathname.startsWith(p + "/"),
      );
      if (!alreadyOnLogin) {
        window.location.href = "/v1/login";
        return new Promise(() => {}); // never resolves — page is navigating away
      }
    }

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

    return Promise.reject({
      message: (error.response?.data as Record<string, unknown>)?.message || error.message || "An error occurred",
      status: error.response?.status,
      data: error.response?.data,
    });
  },
);

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
