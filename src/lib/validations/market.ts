import { z } from "zod";

import { DISTRICTS } from "@/lib/constants/app";

/**
 * Market & Product Validation Schemas
 */

export const qualityCertificationEnum = z.enum([
  "organic",
  "gap",
  "fssai",
  "agmark",
  "iso",
  "haccp",
  "india_organic",
  "npop",
  "other",
]);

export const productStatusEnum = z.enum(["draft", "pending", "active", "sold", "expired", "rejected"]);

// Product Listing Schema
export const productListingSchema = z.object({
  productName: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must be less than 100 characters"),
  productNameMl: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  categoryMl: z.string().optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  descriptionMl: z.string().max(1000).optional(),
  pricing: z.object({
    amount: z.number().positive("Price must be greater than 0"),
    unit: z.string().min(1, "Price unit is required (e.g., per kg)"),
    currency: z.string().default("INR"),
    negotiable: z.boolean().default(false),
  }),
  quantity: z.object({
    available: z.number().positive("Quantity must be greater than 0"),
    unit: z.string().min(1, "Quantity unit is required"),
    minOrder: z.number().positive().optional(),
  }),
  location: z.object({
    district: z.enum(DISTRICTS as unknown as [string, ...string[]], {
      message: "Please select a valid district",
    }),
    address: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number().min(8).max(13),
        lng: z.number().min(74).max(78),
      })
      .optional(),
  }),
  qualityCertifications: z.array(qualityCertificationEnum).default([]),
  images: z.array(z.string()).max(5, "Maximum 5 images allowed").optional(),
  harvestDate: z.string().optional(),
  expiryDate: z.string().optional(),
  ondcListed: z.boolean().default(false),
  farmerConnectListed: z.boolean().default(false),
});

// Product Search Schema
export const productSearchSchema = z.object({
  category: z.string().optional(),
  district: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  certifications: z.array(qualityCertificationEnum).optional(),
  status: productStatusEnum.optional(),
  search: z.string().optional(),
});

// Match Response Schema
export const matchResponseSchema = z.object({
  response: z.enum(["accepted", "rejected"]),
  notes: z.string().max(500).optional(),
});

// Marketing Strategy Request Schema
export const marketingStrategyRequestSchema = z.object({
  commodity: z.string().min(1, "Commodity is required"),
  region: z.string().min(1, "Region is required"),
  targetMarket: z.string().min(1, "Target market is required"),
  productId: z.string().optional(),
});

// Type exports
export type ProductListingFormData = z.infer<typeof productListingSchema>;
export type ProductSearchFormData = z.infer<typeof productSearchSchema>;
export type MatchResponseFormData = z.infer<typeof matchResponseSchema>;
export type MarketingStrategyRequestFormData = z.infer<typeof marketingStrategyRequestSchema>;
