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
  // Optional manual override — the FPO's actual measured soil pH. Null
  // when not provided, in which case the ML service estimates it from
  // the resolved soil type's book-documented pH range instead.
  soil_ph: number | null;
  commodities: string[];
  tier: string | null;
  model_version: string | null;
  financial_year: string;
  // Set by the backend when the last refresh could not reach the recommendation service and this
  // previously saved recommendation is being shown instead. The next successful generation replaces
  // the whole snapshot, which clears these.
  ml_service_offline?: boolean;
  ml_service_offline_at?: string;
  // When this recommendation was actually generated (ISO). Absent on rows saved before this was recorded.
  generated_at?: string;
  // Not sent to the ML service — merged in only for display, so a later
  // "stale" recommendation can still show the actual farm shape it was
  // generated for. Absent on rows saved via the outside-Kerala rejection
  // path (nothing to anchor a map to there).
  location_snapshot?: {
    lat: number | null;
    lng: number | null;
    area_polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
    // Best-effort place name looked up when the recommendation was generated. Absent on
    // recommendations saved before this existed, and null if the lookup failed.
    address?: string | null;
  } | null;
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

// ── Crop Package of Practices — GET /api/recommendations/pop/?crop_name=…
// Real cultivation guidance transcribed from KAU's "Package of Practices
// Recommendations: Crops 2024". Only published (is_active) entries are
// returned; a 404 means the crop hasn't been transcribed yet. ──

export interface CropPopVariety {
  name: string;
  description?: string;
}

export interface CropPopSection {
  heading: string;
  body: string;
}

export interface CropPackageOfPractices {
  id: number;
  crop_name: string;
  crop_group: string;
  season: string;
  varieties: CropPopVariety[];
  spacing: string;
  manuring_fertilizer: string;
  plant_protection: string;
  harvesting: string;
  expected_yield: string;
  // Ordered; preserves the book's own per-crop sub-headings for content
  // that doesn't fit the fixed fields above.
  sections: CropPopSection[];
  source_reference: string;
  source_page_range: string;
  is_active: boolean;
}