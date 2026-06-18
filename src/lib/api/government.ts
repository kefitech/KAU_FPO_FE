import type { ApiResponse, PaginatedResponse } from "@/types";
import type {
  CbboDashboardData,
  ComplianceRecord,
  FpoVerification,
  GovernmentDashboardData,
  GovernmentScheme,
  SchemeLinkage,
  VerificationStatus,
} from "@/types/government";

import { apiClient } from "./client";

// ============ Government Portal ============

/**
 * Get government dashboard data
 */
export async function getGovernmentDashboard(district?: string): Promise<GovernmentDashboardData> {
  const params = district ? `?district=${district}` : "";
  const response = await apiClient.get<ApiResponse<GovernmentDashboardData>>(`/v1/government/dashboard${params}`);
  return response.data.data;
}

/**
 * Get all government schemes
 */
export async function getSchemes(): Promise<GovernmentScheme[]> {
  const response = await apiClient.get<ApiResponse<GovernmentScheme[]>>("/v1/government/schemes");
  return response.data.data;
}

/**
 * Get scheme linkages for FPOs
 */
export async function getSchemeLinkages(
  filters?: { district?: string; schemeId?: string; status?: string },
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<SchemeLinkage>> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (filters?.district) params.append("district", filters.district);
  if (filters?.schemeId) params.append("schemeId", filters.schemeId);
  if (filters?.status) params.append("status", filters.status);

  const response = await apiClient.get<PaginatedResponse<SchemeLinkage>>(
    `/v1/government/scheme-linkages?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get compliance records
 */
export async function getComplianceRecords(
  district?: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<ComplianceRecord>> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (district) params.append("district", district);

  const response = await apiClient.get<PaginatedResponse<ComplianceRecord>>(
    `/v1/government/compliance?${params.toString()}`,
  );
  return response.data;
}

// ============ CBBO/NGO Portal ============

/**
 * Get CBBO dashboard data
 */
export async function getCbboDashboard(): Promise<CbboDashboardData> {
  const response = await apiClient.get<ApiResponse<CbboDashboardData>>("/v1/cbbo/dashboard");
  return response.data.data;
}

/**
 * Get verification queue
 */
export async function getVerificationQueue(
  status?: VerificationStatus,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<FpoVerification>> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (status) params.append("status", status);

  const response = await apiClient.get<PaginatedResponse<FpoVerification>>(
    `/v1/cbbo/verifications?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get single verification details
 */
export async function getVerification(id: string): Promise<FpoVerification> {
  const response = await apiClient.get<ApiResponse<FpoVerification>>(`/v1/cbbo/verifications/${id}`);
  return response.data.data;
}

/**
 * Start verification process
 */
export async function startVerification(fpoId: string): Promise<FpoVerification> {
  const response = await apiClient.post<ApiResponse<FpoVerification>>(`/v1/cbbo/verifications/${fpoId}/start`);
  return response.data.data;
}

/**
 * Update verification checklist item
 */
export async function updateChecklistItem(
  verificationId: string,
  itemId: string,
  data: { isVerified: boolean; notes?: string },
): Promise<FpoVerification> {
  const response = await apiClient.patch<ApiResponse<FpoVerification>>(
    `/v1/cbbo/verifications/${verificationId}/checklist/${itemId}`,
    data,
  );
  return response.data.data;
}

/**
 * Complete verification (approve/reject)
 */
export async function completeVerification(
  verificationId: string,
  data: { status: "verified" | "rejected" | "requires_revision"; notes?: string; rejectionReason?: string },
): Promise<FpoVerification> {
  const response = await apiClient.post<ApiResponse<FpoVerification>>(
    `/v1/cbbo/verifications/${verificationId}/complete`,
    data,
  );
  return response.data.data;
}

/**
 * Add verification document note
 */
export async function addDocumentNote(
  verificationId: string,
  documentId: string,
  data: { isVerified: boolean; notes?: string },
): Promise<FpoVerification> {
  const response = await apiClient.patch<ApiResponse<FpoVerification>>(
    `/v1/cbbo/verifications/${verificationId}/documents/${documentId}`,
    data,
  );
  return response.data.data;
}
