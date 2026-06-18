import type { ApiResponse } from "@/types";
import type { Expert, ExpertContactRequest, ExpertListResponse, ExpertSearchFilters } from "@/types/expert";

import { apiClient } from "./client";

/**
 * Get list of experts with optional filters
 */
export async function getExperts(filters?: ExpertSearchFilters, page = 1, pageSize = 20): Promise<ExpertListResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));

  if (filters?.category) params.append("category", filters.category);
  if (filters?.district) params.append("district", filters.district);
  if (filters?.specialization) params.append("specialization", filters.specialization);
  if (filters?.availability) params.append("availability", filters.availability);
  if (filters?.search) params.append("search", filters.search);

  const response = await apiClient.get<ApiResponse<ExpertListResponse>>(`/v1/experts?${params.toString()}`);
  return response.data.data;
}

/**
 * Get single expert by ID
 */
export async function getExpert(id: string): Promise<Expert> {
  const response = await apiClient.get<ApiResponse<Expert>>(`/v1/experts/${id}`);
  return response.data.data;
}

/**
 * Create new expert (Admin only)
 */
export async function createExpert(data: Omit<Expert, "id" | "createdAt" | "updatedAt">): Promise<Expert> {
  const response = await apiClient.post<ApiResponse<Expert>>("/v1/experts", data);
  return response.data.data;
}

/**
 * Update expert (Admin only)
 */
export async function updateExpert(id: string, data: Partial<Expert>): Promise<Expert> {
  const response = await apiClient.patch<ApiResponse<Expert>>(`/v1/experts/${id}`, data);
  return response.data.data;
}

/**
 * Deactivate expert (Admin only)
 */
export async function deactivateExpert(id: string): Promise<void> {
  await apiClient.patch(`/v1/experts/${id}`, { isActive: false });
}

/**
 * Send contact request to expert (FPO only)
 */
export async function sendContactRequest(
  expertId: string,
  data: { subject: string; message: string },
): Promise<ExpertContactRequest> {
  const response = await apiClient.post<ApiResponse<ExpertContactRequest>>(`/v1/experts/${expertId}/contact`, data);
  return response.data.data;
}

/**
 * Get my contact requests (FPO only)
 */
export async function getMyContactRequests(): Promise<ExpertContactRequest[]> {
  const response = await apiClient.get<ApiResponse<ExpertContactRequest[]>>("/v1/experts/contact-requests/me");
  return response.data.data;
}
