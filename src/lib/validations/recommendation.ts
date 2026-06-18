import { z } from "zod";

import { DISTRICTS } from "@/lib/constants/app";

/**
 * AI Recommendation Validation Schemas
 */

export const soilTypeEnum = z.enum([
  "laterite",
  "alluvial",
  "red_loam",
  "sandy",
  "clay",
  "black_cotton",
  "forest",
  "coastal_sandy",
  "riverine_alluvium",
]);

export const waterAvailabilityEnum = z.enum([
  "irrigated",
  "rainfed",
  "partially_irrigated",
  "well_irrigation",
  "canal_irrigation",
  "drip_irrigation",
]);

export const seasonEnum = z.enum(["kharif", "rabi", "summer", "perennial", "all_seasons"]);

// Crop Recommendation Request Schema
export const cropRecommendationSchema = z.object({
  district: z.enum(DISTRICTS as unknown as [string, ...string[]], {
    message: "Please select a valid district",
  }),
  soilType: soilTypeEnum,
  waterAvailability: waterAvailabilityEnum,
  season: seasonEnum,
  landArea: z.number().positive("Land area must be greater than 0").optional(),
  existingCrops: z.array(z.string()).optional(),
});

// Business Plan Guidance Request Schema
export const businessPlanSchema = z.object({
  commodity: z.string().min(1, "Commodity is required"),
  region: z.string().min(1, "Region is required"),
  fpoSize: z.number().int().positive().optional(),
  currentRevenue: z.number().positive().optional(),
  targetMarket: z.string().optional(),
});

// DPR Generation Request Schema
export const dprGenerationSchema = z.object({
  fpoId: z.string().min(1, "FPO ID is required"),
  projectType: z.enum([
    "processing_unit",
    "storage_facility",
    "marketing_center",
    "value_addition",
    "cold_storage",
    "packaging_unit",
    "custom",
  ]),
  projectTitle: z
    .string()
    .min(5, "Project title must be at least 5 characters")
    .max(200, "Project title must be less than 200 characters"),
  estimatedBudget: z.number().positive("Budget must be greater than 0"),
  commodities: z.array(z.string()).min(1, "At least one commodity is required"),
  targetCapacity: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  additionalDetails: z.string().max(2000).optional(),
});

// Recommendation Feedback Schema
export const recommendationFeedbackSchema = z.object({
  isHelpful: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(1000).optional(),
  implementedCrops: z.array(z.string()).optional(),
});

// Type exports
export type CropRecommendationFormData = z.infer<typeof cropRecommendationSchema>;
export type BusinessPlanFormData = z.infer<typeof businessPlanSchema>;
export type DprGenerationFormData = z.infer<typeof dprGenerationSchema>;
export type RecommendationFeedbackFormData = z.infer<typeof recommendationFeedbackSchema>;
