/**
 * Government & CBBO/NGO Portal Types
 * Based on SRS Section 3.2.2
 */

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
