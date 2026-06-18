import type { BackupCodesResponse, TwoFactorSetupResponse, TwoFactorStatus } from "@/types/auth";

import { api } from "./client";

const BASE = "/auth/2fa";

type Wrapped<T> = { status: string; message: string; data: T };

export const twoFactorApi = {
  getStatus: () => api.get<Wrapped<TwoFactorStatus>>(`${BASE}/status/`).then((r) => r.data.data),

  setup: () => api.post<Wrapped<TwoFactorSetupResponse>>(`${BASE}/setup/`).then((r) => r.data.data),

  verifySetup: (code: string) =>
    api.post<Wrapped<BackupCodesResponse>>(`${BASE}/verify-setup/`, { code }).then((r) => r.data.data),

  loginVerify: (partial_token: string, code: string) =>
    api.post<{ access: string }>(`${BASE}/login/verify/`, { partial_token, code }).then((r) => r.data),

  loginBackup: (partial_token: string, backup_code: string) =>
    api.post<{ access: string }>(`${BASE}/login/backup/`, { partial_token, backup_code }).then((r) => r.data),

  regenerateBackupCodes: (code: string) =>
    api.post<Wrapped<BackupCodesResponse>>(`${BASE}/regenerate-backup-codes/`, { code }).then((r) => r.data.data),

  disable: (payload: { code: string } | { email_otp: string } | { partial_token: string; email_otp: string }) =>
    api.post(`${BASE}/disable/`, payload),

  requestDisableOtp: (partial_token?: string) =>
    api
      .post<{ status: string; message: string; data: null }>(
        `${BASE}/disable/request-otp/`,
        partial_token ? { partial_token } : undefined,
      )
      .then((r) => r.data),

  disableForUser: (user_id: number) => api.post(`${BASE}/disable/${user_id}/`),
};
