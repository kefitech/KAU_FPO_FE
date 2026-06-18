// ─── Languages ───────────────────────────────────────────────────────────────

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  is_rtl: boolean;
  locale: string;
  translation_count: number;
  created_at: string;
  updated_at: string;
}

export interface LanguagePayload {
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  is_rtl: boolean;
  locale: string;
}

// ─── Translation Categories ───────────────────────────────────────────────────

export interface TranslationCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  display_order: number;
  translation_count: number;
  created_at: string;
  updated_at: string;
}

export interface TranslationCategoryPayload {
  code: string;
  name: string;
  description: string;
  display_order: number;
}

// ─── Translations ─────────────────────────────────────────────────────────────

export interface Translation {
  id: number;
  category: number;
  category_code: string;
  category_name: string;
  key: string;
  full_key: string;
  language: number;
  language_code: string;
  language_name: string;
  value: string;
  context: string;
  variables: string[];
  is_verified: boolean;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranslationPayload {
  category: number;
  language: number;
  key: string;
  value: string;
  context?: string;
}

export interface BulkTranslationPayload {
  translations: TranslationPayload[];
}

// ─── Notification Template Codes ──────────────────────────────────────────────

export type NotificationChannel = "email" | "sms" | "in_app" | "push";

export interface NotificationTemplateCode {
  id: number;
  code: string;
  name: string;
  channel: NotificationChannel;
  channel_display: string;
  variables: string[];
  description: string;
  is_active: boolean;
  template_count: number;
  missing_languages: string[];
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateCodePayload {
  code: string;
  name: string;
  channel: NotificationChannel;
  variables: string[];
  description: string;
  is_active: boolean;
}

// ─── Notification Templates ───────────────────────────────────────────────────

export interface NotificationTemplate {
  id: number;
  template_code: number;
  template_code_detail: NotificationTemplateCode;
  language: number;
  language_code: string;
  language_name: string;
  channel: string;
  channel_display: string;
  variables: string[];
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplatePayload {
  template_code: number;
  language: number;
  subject: string;
  body: string;
  is_active: boolean;
}

// ─── Notification Channel Settings ───────────────────────────────────────────

export type ChannelSettingChannel = "email" | "sms" | "in_app";

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

export interface SmsConfig {
  api_key: string;
  sender_id: string;
  base_url: string;
  otp_template_id: string;
}

export interface ChannelSetting {
  id: number;
  channel: ChannelSettingChannel;
  channel_display: string;
  is_active: boolean;
  config: string | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChannelSettingPayload {
  channel: ChannelSettingChannel;
  is_active: boolean;
  config: Record<string, unknown>;
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export interface AdminMenuItem {
  id: number;
  label_key: string;
  label: string;
  path: string;
  icon: string;
  roles: number[];
  role_names: string[];
  parent: number | null;
  children: AdminMenuItem[];
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminMenuItemPayload {
  label_key: string;
  path: string;
  icon: string;
  roles: number[];
  parent: number | null;
  order: number;
  is_active: boolean;
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
}

export interface RolePayload {
  name: string;
}

// ─── Sub-Admins ───────────────────────────────────────────────────────────────

export interface SubAdmin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  date_joined: string;
  permissions: string[];
}

export type NotificationChannelType = "email" | "sms" | "in_app";

export interface SubAdminPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notification_channel: NotificationChannelType;
  permissions: string[];
}

export interface SubAdminUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface AvailablePermission {
  codename: string;
  description: string;
}

// ─── Notification Inbox ───────────────────────────────────────────────────────

export interface InboxNotification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface InboxUnreadCount {
  unread_count: number;
}

// ─── External APIs ───────────────────────────────────────────────────────────

export type ExternalApiService = "pan_verification" | string;

export interface ExternalApi {
  id: number;
  service: ExternalApiService;
  service_display: string;
  api_url: string;
  config: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExternalApiPayload {
  service: string;
  api_url: string;
  config: Record<string, string>;
}

export interface ExternalApiUpdatePayload {
  api_url?: string;
  config?: Record<string, string>;
}

// ─── FPO Actions ──────────────────────────────────────────────────────────────

// List endpoint returns translations as string[] (which languages exist)
export interface FpoAction {
  id: number;
  code: string;
  translations: string[];
  description: string;
  is_active: boolean;
  created_at: string;
}

// Detail endpoint (GET /{id}/) returns translations as object with values
export interface FpoActionDetail extends Omit<FpoAction, "translations"> {
  translations: Record<string, string>;
}

// List with ?labels=true returns translations as a single string (current locale label)
export interface FpoActionLabeled extends Omit<FpoAction, "translations"> {
  translations: string;
}

export interface FpoActionPayload {
  code: string;
  translations: Record<string, string>;
  description?: string;
}

// ─── FPO Member Roles ─────────────────────────────────────────────────────────

// List endpoint returns translations as string[] (which languages exist)
export interface FpoMemberRole {
  id: number;
  code: string;
  translations: string[];
  is_active: boolean;
  created_at: string;
}

// Detail endpoint returns translations as object with values
export interface FpoMemberRoleDetail extends Omit<FpoMemberRole, "translations"> {
  translations: Record<string, string>;
}

// List with ?labels=true returns translations as a single locale string
export interface FpoMemberRoleLabeled extends Omit<FpoMemberRole, "translations"> {
  translations: string;
}

export interface FpoMemberRolePayload {
  code: string;
  translations: Record<string, string>;
  is_active?: boolean;
}

// ─── Schemes (Admin) ─────────────────────────────────────────────────────────

export interface AdminScheme {
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
  is_active: boolean;
  order: number;
}

export interface AdminSchemePayload {
  name_en: string;
  name_ml?: string;
  administering_body: string;
  category: string;
  objective?: string;
  eligibility: string;
  benefit_details: string;
  application_process: string;
  official_link?: string;
  order?: number;
  is_active?: boolean;
}

// ─── Experts (Admin) ─────────────────────────────────────────────────────────

export interface AdminExpert {
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
  is_active: boolean;
}

export interface AdminExpertPayload {
  name_en: string;
  name_ml?: string;
  designation: string;
  organisation: string;
  primary_expertise: string;
  secondary_expertise?: string;
  category: string;
  district?: string;
  email: string;
  phone?: string;
  is_active?: boolean;
}

export interface ExpertEnquiry {
  id: number;
  fpo_name: string;
  message: string;
  created_at: string;
}

// ─── FPO Permissions ──────────────────────────────────────────────────────────

export interface FpoPermissionAction {
  id: number;
  code: string;
  label: string;
}

export interface FpoPermissionRole {
  id: number;
  code: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface FpoPermissionMatrix {
  actions: FpoPermissionAction[];
  roles: FpoPermissionRole[];
}

export interface FpoPermissionUpdate {
  role_id: number;
  action_code: string;
  is_allowed: boolean;
}

// ─── Ownership Claims (Admin) ─────────────────────────────────────────────────

export interface AdminOwnershipClaim {
  id: number;
  fpo_id: number;
  fpo_name: string;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string;
  reason: string;
  supporting_doc_ids: string[];
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  stat_cards: {
    total_registrations: number;
    approved_fpos: number;
    pending_applications: number;
    draft_fpos: number;
    rejected_fpos: number;
    suspended_fpos: number;
  };
  status_breakdown: {
    draft: number;
    submitted: number;
    under_review: number;
    info_required: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
  tier_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    not_assessed: number;
  };
  district_distribution: {
    code: string;
    name: string;
    name_ml: string;
    count: number;
  }[];
  monthly_trend: {
    month: string;
    label: string;
    count: number;
  }[];
  pending_actions: {
    ownership_claims: number;
    unverified_documents: number;
    info_required_fpos: number;
  };
}
