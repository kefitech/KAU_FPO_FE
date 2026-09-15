export interface CBBOFPODocument {
  id: number;
  document_type: string;
  file_url: string | null;
  file_size: number;
  mime_type: string;
  is_verified: boolean;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface AssignedFPO {
  id: number;
  application_id: string;
  name: string;
  name_ml: string;
  district: string;
  district_display: string | null;
  status: string;
  status_display: string;
  tier: string | null;
  registration_number: string | null;
  date_of_registration: string | null;
  legal_structure: string | null;
  legal_structure_display: string | null;
  legal_structure_detail: string | null;
  promoting_agency: string | null;
  promoting_agency_display: string | null;
  facilitating_agency_name: string | null;
  block_taluk: string | null;
  village_town: string | null;
  address_line1: string | null;
  address_line2: string | null;
  pincode: string | null;
  office_phone: string | null;
  office_email: string | null;
  website: string | null;
  total_members: number;
  male_members: number | null;
  female_members: number | null;
  sc_st_members: number | null;
  ceo_available: boolean | null;
  accountant_available: boolean | null;
  total_directors: number | null;
  women_directors: number | null;
  directors_under_35: number | null;
  primary_commodities: string[] | null;
  primary_commodities_display: string[] | null;
  secondary_commodities: string[] | null;
  secondary_commodities_display: string[] | null;
  annual_turnover: string | null;
  signatory_name: string | null;
  signatory_designation: string | null;
  signatory_designation_display: string | null;
  signatory_phone: string | null;
  signatory_email: string | null;
  signatory_aadhaar_last4: string | null;
  bank_name: string | null;
  bank_name_display: string | null;
  bank_branch: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  created_at: string;
  updated_at: string;
  documents: CBBOFPODocument[];
}

export type ReportStatus = "draft" | "submitted";

export interface CBBOReportListItem {
  id: number;
  fpo: number;
  fpo_name: string;
  district: string;
  district_display: string;
  date: string;
  status: ReportStatus;
  participants_count: number;
  created_at: string;
}

export interface CBBOReportDetail {
  id: number;
  fpo: number;
  fpo_name: string;
  cbbo: number;
  cbbo_name: string;
  date: string;
  activities: string;
  participants_count: number;
  outcomes: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface CBBOReportCreatePayload {
  fpo_id: number;
  date: string;
  activities: string;
  participants_count: number;
  outcomes?: string;
}

export interface CBBOReportEditPayload {
  date?: string;
  activities?: string;
  participants_count?: number;
  outcomes?: string;
}
