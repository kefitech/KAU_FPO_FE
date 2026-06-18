export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  preferred_language?: string;
  role: string;
  permissions: string[];
}

export interface SidebarMenuItem {
  label: string;
  path: string;
  icon: string;
}

export type FpoRedirectStage =
  | "wizard_step"
  | "verify_email"
  | "verify_phone"
  | "upload_documents"
  | "submit"
  | "status"
  | "dashboard";

export interface FpoRedirect {
  stage: FpoRedirectStage;
  step: number | null;
}

export interface MeResponse {
  user: User;
  menu: SidebarMenuItem[] | null;
  redirect: FpoRedirect | null;
}

export type LoginResponse =
  | { two_factor_required: true; partial_token: string }
  | { must_change_password: true; partial_token: string }
  | { two_factor_required?: false; must_change_password?: false; user: User };

export interface TwoFactorStatus {
  is_enabled: boolean;
  backup_codes_remaining: number;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  instructions: string;
}

export interface BackupCodesResponse {
  backup_codes: string[];
  warning: string;
}
