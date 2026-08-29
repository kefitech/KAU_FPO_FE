/**
 * Recommendation Types
 * AI-based crop recommendation related types
 */

export interface CropRecommendation {
  cropName: string;
  cropCategory: string;
  confidence: number; // 0-100
  suitabilityScore: number; // 0-10
  expectedYield: {
    min: number;
    max: number;
    unit: string;
  };
  expectedRevenue: {
    min: number;
    max: number;
    currency: string;
  };
  growingSeason: string;
  duration: {
    min: number;
    max: number;
    unit: "days" | "months";
  };
}

export interface RecommendationRationale {
  soilSuitability: number;
  climaticConditions: number;
  waterAvailability: number;
  marketDemand: number;
  profitability: number;
  riskFactor: number;
}

export interface RecommendationInput {
  fpoId: string;
  district: string;
  soilType?: string;
  irrigationAvailable: boolean;
  landSize: number;
  previousCrops?: string[];
  preferences?: {
    organic: boolean;
    exportOriented: boolean;
    shortDuration: boolean;
  };
}

export interface RecommendationResult {
  id: string;
  fpoId: string;
  fpoName: string;
  generatedAt: string;
  recommendations: CropRecommendation[];
  topRecommendation: CropRecommendation;
  rationale: RecommendationRationale;
  marketInsights: {
    currentPrice: number;
    priceRange: { min: number; max: number };
    demandTrend: "high" | "medium" | "low";
    competitors: number;
  };
  governmentSchemes: Array<{
    name: string;
    subsidy: string;
    eligibility: string;
  }>;
  expertAdvice?: string;
  nextSteps: string[];
}

export interface RecommendationHistory {
  id: string;
  fpoId: string;
  generatedAt: string;
  topCrop: string;
  confidence: number;
  status: "pending" | "implemented" | "rejected";
}

/**
 * Business Plan Guidance Types
 */
export interface BusinessPlanGuidance {
  id: string;
  fpoId: string;
  commodity: string;
  region: string;
  generatedAt: string;
  summary: string;
  summaryMl?: string;
  sections: {
    marketAnalysis: string;
    operationalPlan: string;
    financialProjections: string;
    riskAnalysis: string;
    recommendations: string[];
  };
  financialMetrics: {
    estimatedInvestment: number;
    expectedRevenue: number;
    breakEvenPeriod: string;
    roi: number;
  };
}

/**
 * DPR Generation Types
 */
export interface DprGenerationRequest {
  fpoId: string;
  projectType: string;
  projectTitle: string;
  estimatedBudget: number;
  commodities: string[];
  targetCapacity?: string;
  location: string;
  additionalDetails?: string;
}

export interface GeneratedDpr {
  id: string;
  fpoId: string;
  status: "generating" | "ready" | "failed";
  projectTitle: string;
  generatedAt?: string;
  content?: {
    executiveSummary: string;
    projectBackground: string;
    marketAnalysis: string;
    technicalDetails: string;
    financialProjections: string;
    implementationPlan: string;
    riskMitigation: string;
  };
  downloadUrl?: string;
  error?: string;
}

// ── My Recommendation — matches the REAL, tested backend response from
// GET/POST /api/recommendations/me/(request|feedback)/
// (apps/recommendations/api/recommendations.py). One cached recommendation
// per FPO per financial year — district/zone/soil/season are all derived
// server-side, not sent by the client. Named distinctly from the
// speculative CropRecommendation/RecommendationResult types above, which
// belong to a different (not yet built) design and are left as-is for
// when Business Plan Guidance / DPR generation are actually implemented. ──

export interface MyCropSuggestion {
  crop: string;
  confidence: number;
  reasoning: string;
  estimated_yield: string;
  business_guidance: string;
}

export interface MyRecommendationInputSnapshot {
  fpo_id: string;
  district: string | null;
  agro_zone: string | null;
  soil_type: string | null;
  season: string;
  commodities: string[];
  tier: string | null;
  model_version: string | null;
  financial_year: string;
}

/**
 * status added to match the real backend's async pipeline
 * (apps/database/models/recommendations.py CropRecommendation.Status):
 * POST /me/request/ now returns 202 instantly with status="pending" —
 * the actual recommendations arrive later via a background Celery task.
 * Consumers must handle pending/processing (empty recommendations array
 * is expected and NOT an error state) and poll or wait for the
 * recommendation_ready notification to see the real result.
 */
export interface MyRecommendation {
  id: number;
  financial_year: string;
  status: "pending" | "processing" | "completed" | "failed";
  input_snapshot: MyRecommendationInputSnapshot;
  recommendations: MyCropSuggestion[];
  feedback_rating: number | null;
  feedback_comment: string;
  created_at: string;
  // Present only when the AI service was unreachable and this is a
  // cached/fallback result rather than a fresh prediction.
  warning?: string;
}