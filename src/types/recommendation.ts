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
