// ─── Enums / Literals ────────────────────────────────────────────────────────

export type FpoStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "info_required";

export type FpoDocumentType =
  | "fpo_reg_cert"
  | "bank_details"
  | "signatory_id"
  | "pan_card"
  | "gst_cert"
  | "annual_report"
  | "member_list"
  | "board_resolution"
  | "moa_aoa"
  | "other";

// ─── FPO Profile ──────────────────────────────────────────────────────────────

export interface FpoProfile {
  id: number;
  uuid: string;
  application_id: string | null;
  status: FpoStatus;
  status_display: string;
  current_step: number;
  current_tier: string | null;
  // Step 1
  name: string;
  name_ml: string;
  registration_number: string;
  cin_number: string;
  date_of_registration: string;
  legal_structure: string;
  legal_structure_display: string;
  legal_structure_detail: string;
  pan_number: string;
  gst_number: string;
  // Step 2
  district: string;
  district_display: string;
  block_taluk: string;
  village_town: string;
  address_line1: string;
  address_line2: string;
  pincode: string;
  office_phone: string;
  office_email: string;
  website: string;
  email_verified: boolean;
  phone_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  // Step 3
  signatory_name: string;
  signatory_designation: string;
  signatory_phone: string;
  signatory_email: string;
  signatory_aadhaar_last4: string;
  total_members: number | null;
  male_members: number | null;
  female_members: number | null;
  sc_st_members: number | null;
  promoting_agency: string;
  facilitating_agency_name: string;
  ceo_available: boolean;
  accountant_available: boolean;
  total_directors: number | null;
  women_directors: number | null;
  directors_under_35: number | null;
  // Step 4
  primary_commodities: string[];
  secondary_commodities: string[];
  annual_turnover: string | null;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  ifsc_code: string;
  description: string;
  // Meta
  max_secondary_users: number;
  required_docs_uploaded: boolean;
  required_docs_verified: boolean;
  submission_errors: string[];
  origin_claim_id: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface FpoRegisterPayload {
  name: string;
  name_ml?: string;
  registration_number: string;
  cin_number?: string;
  date_of_registration: string;
  legal_structure: string;
  legal_structure_detail?: string;
  pan_number?: string;
  gst_number?: string;
}

export interface FpoStep1Payload {
  step: 1;
  name: string;
  name_ml?: string;
  registration_number: string;
  cin_number?: string;
  date_of_registration: string;
  legal_structure: string;
  legal_structure_detail?: string;
  pan_number?: string;
  gst_number?: string;
}

export interface FpoStep2Payload {
  step: 2;
  district: string;
  block_taluk: string;
  village_town: string;
  address_line1: string;
  address_line2?: string;
  pincode: string;
  office_phone: string;
  office_email: string;
  website?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FpoStep3Payload {
  step: 3;
  signatory_name: string;
  signatory_designation: string;
  signatory_phone: string;
  signatory_email: string;
  signatory_aadhaar_last4: string;
  total_members: number;
  male_members: number;
  female_members: number;
  sc_st_members?: number;
  promoting_agency: string;
  facilitating_agency_name?: string;
  ceo_available: boolean;
  accountant_available: boolean;
  total_directors: number;
  women_directors?: number;
  directors_under_35?: number;
}

export interface FpoStep4Payload {
  step: 4;
  primary_commodities: string[];
  secondary_commodities: string[];
  annual_turnover?: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  ifsc_code: string;
  description?: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface FpoDocument {
  id: string;
  document_type: FpoDocumentType;
  document_type_display: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  is_required: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  uuid: string;
}

export interface FpoDocumentList {
  documents: FpoDocument[];
  missing_required: string[];
  ready_to_submit: boolean;
}

// ─── Field Validation ─────────────────────────────────────────────────────────

export interface FpoFieldValidation {
  field: string;
  valid: boolean;
  error: string | null;
  duplicate: boolean;
  existing_fpo_id?: number | null;
  fpo_name?: string;
}

// ─── Ownership Claim (FPO side) ───────────────────────────────────────────────

export interface FpoClaim {
  id: number;
  fpo_id: number;
  fpo_name: string;
  reason: string;
  supporting_doc_ids: string[];
  status: "pending" | "approved" | "rejected" | "docs_requested" | "docs_submitted";
  review_notes?: string | null;
  created_at: string;
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

export interface FpoStatusEntry {
  id: number;
  from_status: string;
  to_status: string;
  changed_by_name: string;
  notes: string;
  created_at: string;
}

export interface FpoApplicationStatus {
  application_id: string | null;
  status: FpoStatus;
  status_display: string;
  current_tier: string | null;
  timeline: FpoStatusEntry[];
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

export interface FpoEligibilityPayload {
  member_count: number;
  district: string;
  registered_under_act: boolean;
  has_valid_registration: boolean;
  has_bank_account: boolean;
}

export interface FpoEligibilityResponse {
  eligible: boolean;
  eligibility_token?: string;
  errors?: string[];
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface FpoTeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  joined_at: string;
}

export interface FpoTeamInvitePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface FpoBulkInvitePayload {
  members: FpoTeamInvitePayload[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface FpoDashboardNotification {
  id: number;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

export interface FpoDashboard {
  profile: {
    id: string;
    name: string;
    application_id: string;
    status: FpoStatus;
    legal_structure: string;
    primary_commodities: string[];
    current_step: number;
    pan_number: string;
    date_of_registration: string;
    total_members: number;
  };
  tier: {
    tier: string | null;
    financial_year: string | null;
  };
  location: {
    district: string;
    block_taluk: string;
    address_line1: string;
    address_line2: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
  };
  team: {
    total: number;
    active: number;
  };
  documents: {
    uploaded: number;
    verified: number;
    required_missing: string[];
    ready_to_submit: boolean;
  };
  notifications: {
    unread_count: number;
    recent: FpoDashboardNotification[];
  };
  quick_links: { label: string; path: string }[];
}

// ─── Tier Assessment ──────────────────────────────────────────────────────────

export type TierInputType = "number" | "boolean" | "single_select" | "multi_select" | "computed";

export interface TierQuestionOption {
  value: string;
  label: string;
  score: number;
}

export interface TierAnswerConfig {
  options?: TierQuestionOption[];
  min?: number;
  max?: number;
}

export interface TierQuestion {
  question_no: number;
  text: string;
  input_type: TierInputType;
  is_required: boolean;
  is_prefilled?: boolean;
  domain_code: string;
  domain_name: string;
  answer_config: TierAnswerConfig;
  is_conditional: boolean;
  condition_on_question_no: number | null;
  condition_value: string | null;
  has_upload?: boolean;
  upload_label?: string;
}

export interface TierUpload {
  id: number;
  question_no: number;
  original_filename: string;
  file_url: string;
  uploaded_at: string;
}

export interface TierAssessmentAnswer {
  question_no: number;
  answer: string | number | string[];
  score: string;
}

export interface TierDomainScore {
  domain_code: string;
  domain_name: string;
  score: number;
  max_score: number;
}

export interface TierAssessment {
  id: number;
  status: "draft" | "submitted";
  total_score: string | null;
  tier_assigned: string;
  submitted_at: string | null;
  domain_scores?: TierDomainScore[];
  answers: TierAssessmentAnswer[];
  uploads?: TierUpload[];
}

export interface TierAssessmentData {
  financial_year: string;
  assessment: TierAssessment | null;
  questions: TierQuestion[];
}

export interface TierHistoryItem {
  id: number;
  financial_year: string;
  status: "draft" | "submitted";
  total_score: string;
  tier_assigned: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  answers: TierAssessmentAnswer[];
}

// ─── Schemes ─────────────────────────────────────────────────────────────────

export interface FpoScheme {
  id: number;
  name: string;
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
}

// ─── Experts ─────────────────────────────────────────────────────────────────

export interface FpoExpert {
  id: number;
  name: string;
  name_en: string;
  name_ml: string;
  designation: string;
  organisation: string;
  primary_expertise: string;
  secondary_expertise: string;
  district: string;
  email: string;
  phone: string;
  category: string;
  category_display: string;
}

// ─── UI Constants ─────────────────────────────────────────────────────────────

export const DISTRICT_OPTIONS = [
  { value: "TVM", label: "Thiruvananthapuram" },
  { value: "KLM", label: "Kollam" },
  { value: "PTA", label: "Pathanamthitta" },
  { value: "ALP", label: "Alappuzha" },
  { value: "KTM", label: "Kottayam" },
  { value: "IDK", label: "Idukki" },
  { value: "EKM", label: "Ernakulam" },
  { value: "TSR", label: "Thrissur" },
  { value: "PKD", label: "Palakkad" },
  { value: "MLP", label: "Malappuram" },
  { value: "KZD", label: "Kozhikode" },
  { value: "WYD", label: "Wayanad" },
  { value: "KNR", label: "Kannur" },
  { value: "KSD", label: "Kasaragod" },
] as const;

export const REQUIRED_DOC_CONFIG: { type: FpoDocumentType; label: string; maxSizeMB: number }[] = [
  { type: "fpo_reg_cert", label: "FPO Registration Certificate", maxSizeMB: 5 },
  { type: "bank_details", label: "Bank Statement / Details", maxSizeMB: 5 },
  { type: "pan_card", label: "PAN Card", maxSizeMB: 5 },
];

export const OPTIONAL_DOC_CONFIG: { type: FpoDocumentType; label: string; maxSizeMB: number }[] = [
  { type: "gst_cert", label: "GST Certificate", maxSizeMB: 5 },
  { type: "annual_report", label: "Annual Report", maxSizeMB: 10 },
  { type: "member_list", label: "Member List (PDF / XLSX)", maxSizeMB: 10 },
  { type: "board_resolution", label: "Board Resolution", maxSizeMB: 5 },
  { type: "moa_aoa", label: "MOA / AOA", maxSizeMB: 5 },
  { type: "other", label: "Other Document", maxSizeMB: 5 },
];

export const WIZARD_STEPS = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Contact" },
  { number: 3, label: "Signatory" },
  { number: 4, label: "Business & Bank" },
  { number: 5, label: "Verification" },
  { number: 6, label: "Documents" },
  { number: 7, label: "Review & Submit" },
] as const;
