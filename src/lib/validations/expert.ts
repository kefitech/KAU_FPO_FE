import { z } from "zod";

import { DISTRICTS } from "@/lib/constants/app";

/**
 * Expert Directory Validation Schemas
 */

export const expertCategoryEnum = z.enum([
  "scientist",
  "trainer",
  "banker",
  "facilitator",
  "agronomist",
  "marketing_expert",
  "technical_advisor",
]);

export const expertAvailabilityEnum = z.enum(["available", "busy", "unavailable"]);

export const contactMethodEnum = z.enum(["email", "phone", "platform", "all"]);

// Create/Update Expert Schema (Admin)
export const expertSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  nameMl: z.string().optional(),
  designation: z.string().min(2, "Designation is required"),
  designationMl: z.string().optional(),
  category: expertCategoryEnum,
  specialization: z
    .array(z.string())
    .min(1, "At least one specialization is required")
    .max(5, "Maximum 5 specializations allowed"),
  specializationMl: z.array(z.string()).optional(),
  organization: z.string().min(2, "Organization is required"),
  organizationMl: z.string().optional(),
  district: z.enum(DISTRICTS as unknown as [string, ...string[]], {
    message: "Please select a valid district",
  }),
  contactEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  contactMethod: contactMethodEnum,
  availability: expertAvailabilityEnum,
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  bioMl: z.string().max(1000).optional(),
  experience: z.number().int().min(0, "Experience cannot be negative").max(60, "Experience seems too high").optional(),
  isActive: z.boolean().default(true),
});

// Contact Request Schema (FPO)
export const contactRequestSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be less than 200 characters"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(2000, "Message must be less than 2000 characters"),
});

// Expert Search Schema
export const expertSearchSchema = z.object({
  category: expertCategoryEnum.optional(),
  district: z.string().optional(),
  specialization: z.string().optional(),
  availability: expertAvailabilityEnum.optional(),
  search: z.string().optional(),
});

// Type exports
export type ExpertFormData = z.infer<typeof expertSchema>;
export type ContactRequestFormData = z.infer<typeof contactRequestSchema>;
export type ExpertSearchFormData = z.infer<typeof expertSearchSchema>;
