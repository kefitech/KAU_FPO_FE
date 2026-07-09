import { AxiosError } from "axios";

interface ApiErrorResponse {
  status: string;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

interface InterceptedError {
  message: string;
  status: number;
  data?: ApiErrorResponse;
}

function isInterceptedError(error: unknown): error is InterceptedError {
  return typeof error === "object" && error !== null && "data" in error;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isInterceptedError(error)) {
    const data = error.data;

    if (data?.errors) {
      const firstFieldError = Object.values(data.errors)[0]?.[0];
      if (firstFieldError) return firstFieldError;
    }

    if (data?.message) return data.message;
    if (error.message) return error.message;
  }

  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.errors) {
      const firstFieldError = Object.values(data.errors)[0]?.[0];
      if (firstFieldError) return firstFieldError;
    }
    if (data?.message) return data.message;
  }

  return fallback;
}