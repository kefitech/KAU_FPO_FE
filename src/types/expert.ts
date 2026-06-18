/**
 * Expert Directory Types
 * Based on SRS Section 3.2.4
 */

export type ExpertCategory =
  | "scientist"
  | "trainer"
  | "banker"
  | "facilitator"
  | "agronomist"
  | "marketing_expert"
  | "technical_advisor";

export type ExpertAvailability = "available" | "busy" | "unavailable";

export interface Expert {
  id: string;
  name: string;
  nameMl?: string; // Malayalam name
  designation: string;
  designationMl?: string;
  category: ExpertCategory;
  specialization: string[];
  specializationMl?: string[];
  organization: string;
  organizationMl?: string;
  district: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMethod: "email" | "phone" | "platform" | "all";
  availability: ExpertAvailability;
  profileImage?: string;
  bio?: string;
  bioMl?: string;
  experience?: number; // Years of experience
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertContactRequest {
  id: string;
  expertId: string;
  fpoId: string;
  subject: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  createdAt: string;
  respondedAt?: string;
}

export interface ExpertSearchFilters {
  category?: ExpertCategory;
  district?: string;
  specialization?: string;
  availability?: ExpertAvailability;
  search?: string;
}

export interface ExpertListResponse {
  experts: Expert[];
  total: number;
  page: number;
  pageSize: number;
}
