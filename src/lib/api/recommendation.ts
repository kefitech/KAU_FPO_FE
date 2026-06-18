import type { ApiResponse } from "@/types/api";
import type {
  BusinessPlanGuidance,
  CropRecommendation,
  DprGenerationRequest,
  GeneratedDpr,
  RecommendationHistory,
} from "@/types/recommendation";

import { apiClient } from "./client";

/**
 * Get AI-powered crop recommendations
 */
export async function getCropRecommendations(data: {
  district: string;
  soilType: string;
  waterAvailability: string;
  season: string;
  landArea?: number;
  existingCrops?: string[];
}): Promise<CropRecommendation[]> {
  const response = await apiClient.post<ApiResponse<CropRecommendation[]>>("/v1/recommendations/crops", data);
  return response.data.data;
}

/**
 * Get business plan guidance
 */
export async function getBusinessPlanGuidance(data: {
  commodity: string;
  region: string;
  fpoSize?: number;
  currentRevenue?: number;
  targetMarket?: string;
}): Promise<BusinessPlanGuidance> {
  const response = await apiClient.post<ApiResponse<BusinessPlanGuidance>>("/v1/recommendations/business-plan", data);
  return response.data.data;
}

/**
 * Generate DPR (Detailed Project Report)
 */
export async function generateDpr(data: DprGenerationRequest): Promise<GeneratedDpr> {
  const response = await apiClient.post<ApiResponse<GeneratedDpr>>("/v1/recommendations/dpr/generate", data);
  return response.data.data;
}

/**
 * Get DPR status (for async generation)
 */
export async function getDprStatus(dprId: string): Promise<GeneratedDpr> {
  const response = await apiClient.get<ApiResponse<GeneratedDpr>>(`/v1/recommendations/dpr/${dprId}`);
  return response.data.data;
}

/**
 * Download DPR as PDF
 */
export async function downloadDpr(dprId: string): Promise<Blob> {
  const response = await apiClient.get(`/v1/recommendations/dpr/${dprId}/download`, {
    responseType: "blob",
  });
  return response.data;
}

/**
 * Get my recommendation history (FPO only)
 */
export async function getMyRecommendationHistory(): Promise<RecommendationHistory[]> {
  const response = await apiClient.get<ApiResponse<RecommendationHistory[]>>("/v1/recommendations/history/me");
  return response.data.data;
}

/**
 * Save recommendation feedback (for improving AI)
 */
export async function saveRecommendationFeedback(
  recommendationId: string,
  data: {
    isHelpful: boolean;
    rating?: number;
    feedback?: string;
    implementedCrops?: string[];
  },
): Promise<void> {
  await apiClient.post(`/v1/recommendations/${recommendationId}/feedback`, data);
}
