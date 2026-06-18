/**
 * FPO Validation Schemas
 * Zod schemas for FPO forms
 */

import { z } from "zod";

const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

export const fpoStep1Schema = z.object({
  name: z.string().min(3, "FPO name must be at least 3 characters"),
  type: z.enum(["producer_company", "cooperative_society", "trust", "other"]),
  district: z.string().min(1, "District is required"),
  memberCount: z.number().min(10, "Minimum 10 members required"),
  landHolding: z.number().min(5, "Minimum 5 hectares required"),
});

export const fpoStep2Schema = z.object({
  registrationNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    village: z.string().min(1, "Village is required"),
    panchayat: z.string().min(1, "Panchayat is required"),
    block: z.string().min(1, "Block is required"),
    district: z.string().min(1, "District is required"),
    state: z.string().default("Kerala"),
    pincode: z.string().regex(pincodeRegex, "Invalid pincode"),
  }),
  contactPerson: z.object({
    name: z.string().min(2, "Contact person name is required"),
    phone: z.string().regex(phoneRegex, "Invalid phone number"),
    email: z.string().email("Invalid email address"),
    designation: z.string().min(1, "Designation is required"),
  }),
  crops: z.array(z.string()).min(1, "Select at least one crop"),
});

export const fpoStep3Schema = z.object({
  documents: z.array(z.instanceof(File)).min(1, "Upload at least one document"),
});

export const fpoCompleteSchema = fpoStep1Schema.merge(fpoStep2Schema).merge(fpoStep3Schema);

export const fpoEligibilitySchema = z.object({
  district: z.string().min(1, "District is required"),
  memberCount: z.number().min(1, "Member count is required"),
  landHolding: z.number().min(1, "Land holding is required"),
});

export const fpoFilterSchema = z.object({
  status: z.enum(["draft", "pending", "under_review", "approved", "rejected", "active", "inactive"]).optional(),
  district: z.string().optional(),
  type: z.enum(["producer_company", "cooperative_society", "trust", "other"]).optional(),
  search: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(10),
});

export type FpoStep1FormData = z.infer<typeof fpoStep1Schema>;
export type FpoStep2FormData = z.infer<typeof fpoStep2Schema>;
export type FpoStep3FormData = z.infer<typeof fpoStep3Schema>;
export type FpoCompleteFormData = z.infer<typeof fpoCompleteSchema>;
export type FpoEligibilityFormData = z.infer<typeof fpoEligibilitySchema>;
export type FpoFilterFormData = z.infer<typeof fpoFilterSchema>;
