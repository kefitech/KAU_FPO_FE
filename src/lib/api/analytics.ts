import type {
  AnalyticsFilters,
  DashboardSummary,
  DistrictAnalytics,
  ReportRequest,
  ReportResponse,
  StateAnalytics,
} from "@/types/analytics";
import type { ApiResponse } from "@/types/api";

import { apiClient } from "./client";

/**
 * Get dashboard summary statistics
 */
export async function getDashboardSummary(filters?: AnalyticsFilters): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (filters?.timeRange) params.append("timeRange", filters.timeRange);
  if (filters?.district) params.append("district", filters.district);
  if (filters?.dateRange) {
    params.append("startDate", filters.dateRange.start);
    params.append("endDate", filters.dateRange.end);
  }

  const response = await apiClient.get<ApiResponse<DashboardSummary>>(`/v1/analytics/summary?${params.toString()}`);
  return response.data.data;
}

/**
 * Get district-level analytics
 */
export async function getDistrictAnalytics(district: string, filters?: AnalyticsFilters): Promise<DistrictAnalytics> {
  const params = new URLSearchParams();
  if (filters?.timeRange) params.append("timeRange", filters.timeRange);
  if (filters?.commodity) params.append("commodity", filters.commodity);
  if (filters?.dateRange) {
    params.append("startDate", filters.dateRange.start);
    params.append("endDate", filters.dateRange.end);
  }

  const response = await apiClient.get<ApiResponse<DistrictAnalytics>>(
    `/v1/analytics/district/${district}?${params.toString()}`,
  );
  return response.data.data;
}

/**
 * Get state-level analytics
 */
export async function getStateAnalytics(filters?: AnalyticsFilters): Promise<StateAnalytics> {
  const params = new URLSearchParams();
  if (filters?.timeRange) params.append("timeRange", filters.timeRange);
  if (filters?.commodity) params.append("commodity", filters.commodity);
  if (filters?.dateRange) {
    params.append("startDate", filters.dateRange.start);
    params.append("endDate", filters.dateRange.end);
  }

  const response = await apiClient.get<ApiResponse<StateAnalytics>>(`/v1/analytics/state?${params.toString()}`);
  return response.data.data;
}

/**
 * Get FPO-specific analytics
 */
export async function getFpoAnalytics(fpoId: string, filters?: AnalyticsFilters) {
  const params = new URLSearchParams();
  if (filters?.timeRange) params.append("timeRange", filters.timeRange);
  if (filters?.dateRange) {
    params.append("startDate", filters.dateRange.start);
    params.append("endDate", filters.dateRange.end);
  }

  const response = await apiClient.get<ApiResponse<unknown>>(`/v1/analytics/fpo/${fpoId}?${params.toString()}`);
  return response.data.data;
}

/**
 * Generate report
 */
export async function generateReport(request: ReportRequest): Promise<ReportResponse> {
  const response = await apiClient.post<ApiResponse<ReportResponse>>("/v1/analytics/reports", request);
  return response.data.data;
}

/**
 * Get report status
 */
export async function getReportStatus(reportId: string): Promise<ReportResponse> {
  const response = await apiClient.get<ApiResponse<ReportResponse>>(`/v1/analytics/reports/${reportId}`);
  return response.data.data;
}

/**
 * Download report
 */
export async function downloadReport(reportId: string): Promise<Blob> {
  const response = await apiClient.get(`/v1/analytics/reports/${reportId}/download`, {
    responseType: "blob",
  });
  return response.data;
}
