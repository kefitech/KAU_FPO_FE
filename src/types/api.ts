export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}
