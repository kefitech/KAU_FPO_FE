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
  total_members: number;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = "draft" | "submitted";

export interface CBBOReportListItem {
  id: number;
  fpo: number;
  fpo_name: string;
  district: string;
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
