/**
 * Government & CBBO/NGO Portal Types
 * Based on SRS Section 3.2.2
 */

export interface GovtDashboardStats {
  total: number;
  by_status: Record<string, number>;
  by_district: Record<string, number>;
  jurisdiction_type: "state" | "district";
}

// Government Official Types
export type GovernmentRole =
  | "district_officer"
  | "state_officer"
  | "scheme_coordinator"
  | "monitoring_officer"
  | "viewer";

export interface GovernmentUser {
  id: string;
  name: string;
  email: string;
  role: GovernmentRole;
  department: string;
  designation: string;
  jurisdiction: {
    type: "district" | "state";
    districts?: string[]; // If district-level, which districts
  };
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

// CBBO/NGO Types
export type CbboType = "cbbo" | "ngo" | "cooperative" | "trust";

export interface CbboOrganization {
  id: string;
  name: string;
  nameMl?: string;
  type: CbboType;
  registrationNumber: string;
  address: string;
  district: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  assignedDistricts: string[];
  fposAssigned: number;
  fposVerified: number;
  isActive: boolean;
  createdAt: string;
}

export interface CbboUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: "manager" | "verifier" | "viewer";
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

// FPO Verification (by CBBO)
export type VerificationStatus = "pending" | "in_progress" | "verified" | "rejected" | "requires_revision";

export interface FpoVerification {
  id: string;
  fpoId: string;
  fpoName: string;
  fpoDistrict: string;
  cbboId: string;
  cbboName: string;
  verifierId: string;
  verifierName: string;
  status: VerificationStatus;
  checklist: VerificationChecklistItem[];
  documents: VerificationDocument[];
  notes?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationChecklistItem {
  id: string;
  item: string;
  itemMl?: string;
  category: string;
  isVerified: boolean;
  notes?: string;
  verifiedAt?: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  isVerified: boolean;
  notes?: string;
}

// Scheme Linkage
export interface GovernmentScheme {
  id: string;
  name: string;
  nameMl?: string;
  description: string;
  descriptionMl?: string;
  ministry: string;
  category: "subsidy" | "loan" | "training" | "infrastructure" | "marketing" | "other";
  eligibilityCriteria: string[];
  benefits: string[];
  applicationProcess?: string;
  deadline?: string;
  maxAmount?: number;
  isActive: boolean;
}

export interface SchemeLinkage {
  id: string;
  fpoId: string;
  fpoName: string;
  schemeId: string;
  schemeName: string;
  status: "applied" | "under_review" | "approved" | "rejected" | "disbursed";
  appliedAt: string;
  approvedAt?: string;
  amount?: number;
  notes?: string;
}

// Compliance Tracking
export type ComplianceStatus = "compliant" | "non_compliant" | "pending_review" | "grace_period";

export interface ComplianceRecord {
  id: string;
  fpoId: string;
  fpoName: string;
  category: string;
  requirement: string;
  status: ComplianceStatus;
  dueDate?: string;
  lastChecked: string;
  notes?: string;
  documents?: string[];
}

// Government Dashboard Data
export interface GovernmentDashboardData {
  summary: {
    totalFpos: number;
    verifiedFpos: number;
    pendingVerification: number;
    schemeBeneficiaries: number;
    totalDisbursed: number;
  };
  districtWiseStats: {
    district: string;
    fpoCount: number;
    verifiedCount: number;
    schemeLinkages: number;
    complianceRate: number;
  }[];
  recentApplications: {
    id: string;
    fpoName: string;
    district: string;
    appliedAt: string;
    status: string;
  }[];
  schemeUtilization: {
    schemeId: string;
    schemeName: string;
    beneficiaries: number;
    totalAmount: number;
  }[];
}

// CBBO Dashboard Data
export interface CbboDashboardData {
  summary: {
    assignedFpos: number;
    verifiedFpos: number;
    pendingVerification: number;
    inProgressVerification: number;
  };
  verificationQueue: FpoVerification[];
  recentActivity: {
    id: string;
    action: string;
    fpoName: string;
    timestamp: string;
  }[];
  performanceMetrics: {
    verificationsThisMonth: number;
    averageVerificationTime: number; // in days
    approvalRate: number; // percentage
  };
}
// Added for Government Portal API integration
export interface GovtDashboardStats {
  total: number;
  by_status: Record<string, number>;
  by_district: Record<string, number>;
  jurisdiction_type: "state" | "district";
}

// Added for enriched FPO Directory detail view
export interface GovtFPODetail {
  id: number;
  application_id: string;
  name: string;
  name_ml: string;
  district: string;
  district_display: string | null;
  status: string;
  status_display: string;
  tier: string | null;
  registration_number: string;
  date_of_registration: string | null;
  legal_structure: string;
  legal_structure_display: string;
  promoting_agency_display: string;
  legal_structure_detail: string;
  promoting_agency: string | null;
  facilitating_agency_name: string | null;
  block_taluk: string;
  village_town: string;
  address_line1: string;
  address_line2: string;
  pincode: string;
  office_phone: string;
  office_email: string;
  website: string;
  total_members: number | null;
  male_members: number | null;
  female_members: number | null;
  sc_st_members: number | null;
  ceo_available: boolean;
  accountant_available: boolean;
  total_directors: number | null;
  women_directors: number | null;
  directors_under_35: number | null;
  primary_commodities: string[];
  primary_commodities_display: string[];
  secondary_commodities: string[];
  secondary_commodities_display: string[];
  annual_turnover: string | null;
  signatory_name: string;
  signatory_designation: string;
  signatory_designation_display: string;
  signatory_phone: string;
  signatory_email: string;
  signatory_aadhaar_last4: string;
  bank_name: string;
  bank_name_display: string;
  bank_branch: string;
  account_number: string;
  ifsc_code: string;
  created_at: string;
  updated_at: string;
}

// Added for Training Sessions and Schemes write access
export interface GovtTrainingSession {
  id: number;
  fpo: number;
  fpo_name: string;
  district: string;
  topic: string;
  date: string;
  duration_hours: string;
  participants_count: number;
  venue: string;
  attendance_count: number;
}

export interface GovtTrainingSessionDetail {
  id: number;
  fpo: number;
  fpo_name: string;
  topic: string;
  date: string;
  duration_hours: string;
  participants_count: number;
  venue: string;
  attendance: { id: number; member_name: string; attended: boolean }[];
  created_at: string;
  updated_at: string;
}

export interface GovtTrainingSessionPayload {
  fpo_id: number;
  topic: string;
  date: string;
  duration_hours: number;
  participants_count?: number;
  venue?: string;
}

export interface GovtScheme {
  id: number;
  name_en: string;
  name_ml: string;
  administering_body: string;
  category: string;
  category_display: string;
  objective: string;
  eligibility: string;
  benefit_details: string;
  application_process: string;
  official_link: string;
  last_updated: string | null;
  is_active: boolean;
  order: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovtSchemePayload {
  name_en: string;
  name_ml?: string;
  administering_body: string;
  category: string;
  objective?: string;
  eligibility: string;
  benefit_details: string;
  application_process: string;
  official_link?: string;
  last_updated?: string | null;
  is_active?: boolean;
  order?: number;
}
