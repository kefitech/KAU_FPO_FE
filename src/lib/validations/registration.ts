import { z } from "zod";

import { DISTRICTS } from "@/lib/constants/app";

/**
 * FPO Registration Wizard Validation Schemas
 * Based on SRS Section 3.1.2
 */

// Step 1: Eligibility Check
export const eligibilitySchema = z.object({
  isFpoRegistered: z.boolean().refine((val) => val === true, {
    message: "FPO must be registered to proceed",
  }),
  hasMinimumMembers: z.boolean().refine((val) => val === true, {
    message: "FPO must have minimum required members",
  }),
  isInKerala: z.boolean().refine((val) => val === true, {
    message: "FPO must be operating in Kerala",
  }),
  hasValidDocuments: z.boolean().refine((val) => val === true, {
    message: "FPO must have valid registration documents",
  }),
});

// Step 2: Organization Details
export const organizationDetailsSchema = z.object({
  organizationName: z
    .string()
    .min(3, "Organization name must be at least 3 characters")
    .max(200, "Organization name must be less than 200 characters"),
  organizationNameMl: z.string().optional(),
  registrationNumber: z
    .string()
    .min(5, "Registration number must be at least 5 characters")
    .max(50, "Registration number must be less than 50 characters"),
  registrationDate: z.string().min(1, "Registration date is required"),
  district: z.enum(DISTRICTS as unknown as [string, ...string[]], {
    message: "Please select a valid district",
  }),
  address: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must be less than 500 characters"),
  pincode: z.string().regex(/^6\d{5}$/, "Please enter a valid Kerala pincode (starts with 6)"),
  memberCount: z.number().int().min(10, "FPO must have at least 10 members").max(10000, "Member count seems too high"),
  commodities: z
    .array(z.string())
    .min(1, "Please select at least one commodity")
    .max(10, "Maximum 10 commodities allowed"),
});

// Step 3: Contact Person Details
export const contactPersonSchema = z.object({
  contactPersonName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  contactPersonDesignation: z.string().min(2, "Designation is required"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  alternatePhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
});

// Step 4: Bank Details
export const bankDetailsSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  branchName: z.string().min(2, "Branch name is required"),
  accountNumber: z
    .string()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number must be less than 18 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code"),
  accountHolderName: z.string().min(2, "Account holder name is required"),
});

// Step 5: Document Upload
export const documentUploadSchema = z.object({
  registrationCertificate: z.string().min(1, "Registration certificate is required"),
  bankDocument: z.string().min(1, "Bank document is required"),
  authorizedSignatoryId: z.string().min(1, "Government ID of authorized signatory is required"),
  additionalDocuments: z.array(z.string()).optional(),
});

// Complete Registration Schema
export const completeRegistrationSchema = z.object({
  eligibility: eligibilitySchema,
  organization: organizationDetailsSchema,
  contact: contactPersonSchema,
  bank: bankDetailsSchema,
  documents: documentUploadSchema,
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy",
  }),
});

// Type exports
export type EligibilityFormData = z.infer<typeof eligibilitySchema>;
export type OrganizationDetailsFormData = z.infer<typeof organizationDetailsSchema>;
export type ContactPersonFormData = z.infer<typeof contactPersonSchema>;
export type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
export type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;
