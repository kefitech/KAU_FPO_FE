import type { ApiResponse } from "@/types/api";
import type {
  BusinessPlanGuidance,
  DprGenerationRequest,
  GeneratedDpr,
  MyRecommendation,
} from "@/types/recommendation";

import { apiClient } from "./client";

// ── My Recommendation — matches the REAL, tested backend endpoint:
// GET/POST /api/recommendations/me/(request|feedback)/
// (apps/recommendations/api/recommendations.py). ──

const RECOMMENDATION_PATH = "/recommendations/me/";
const RECOMMENDATION_REQUEST_PATH = "/recommendations/me/request/";
const RECOMMENDATION_FEEDBACK_PATH = "/recommendations/me/feedback/";

/**
 * Fetch the current FPO's cached recommendation for this financial year.
 * Returns null if none has been requested yet (backend returns 404 in
 * that case — expected, not an error state to surface).
 */
export async function getMyRecommendation(): Promise<MyRecommendation | null> {
  try {
    const response = await apiClient.get<ApiResponse<MyRecommendation>>(RECOMMENDATION_PATH);
    return response.data.data;
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return null;
    throw error;
  }
}

/**
 * Request a fresh recommendation — triggers the backend to call the
 * ML service (FastAPI) with the FPO's current district/zone/soil/
 * season/commodities/tier, derived server-side. Replaces any existing
 * cached recommendation for this financial year.
 */
export async function requestFreshRecommendation(): Promise<MyRecommendation> {
  const response = await apiClient.post<ApiResponse<MyRecommendation>>(RECOMMENDATION_REQUEST_PATH);
  return response.data.data;
}

/**
 * Submit a 1-5 rating (and optional comment) on the current cached
 * recommendation. No recommendation ID needed — always applies to the
 * FPO's current financial year's cached result.
 */
export async function submitRecommendationFeedback(
  rating: number,
  comment?: string,
): Promise<MyRecommendation> {
  const response = await apiClient.post<ApiResponse<MyRecommendation>>(RECOMMENDATION_FEEDBACK_PATH, {
    rating,
    comment: comment ?? "",
  });
  return response.data.data;
}

// ── Below: speculative functions for features not yet built on the
// backend (Business Plan Guidance, DPR generation). Left as-is —
// endpoints don't exist yet, these will need the same real-backend
// treatment once that work happens. ──

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