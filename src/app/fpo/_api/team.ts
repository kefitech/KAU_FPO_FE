import { api } from "@/lib/api/client";
import type { FpoBulkInvitePayload, FpoMemberPermission, FpoTeamInvitePayload, FpoTeamMember } from "@/types/fpo";

type BulkInviteFileResponse = {
  status: string;
  message: string;
  data: {
    success: number;
    failed: number;
    results: { row: number; email: string; name: string }[];
    errors: { row: number; email: string; reason: string }[];
  };
};

interface BulkToggleResponse {
  success: number;
  failed: number;
  results: { user_id: number; name: string }[];
  errors: { user_id: number; name?: string; reason: string }[];
}

const BASE = "/fpo/me/team/";

type ListResponse = FpoTeamMember[] | { status: string; message: string; data: FpoTeamMember[] };

export const fpoTeamApi = {
  list: (): Promise<FpoTeamMember[]> =>
    api.get<ListResponse>(BASE).then((r) => (Array.isArray(r.data) ? r.data : (r.data.data ?? []))),

  invite: (payload: FpoTeamInvitePayload): Promise<void> => api.post(`${BASE}invite/`, payload).then(() => undefined),

  bulkInvite: (payload: FpoBulkInvitePayload): Promise<BulkInviteFileResponse> =>
    api.post<BulkInviteFileResponse>(`${BASE}bulk-invite/`, payload).then((r) => r.data as BulkInviteFileResponse),

  bulkInviteFile: (file: File): Promise<BulkInviteFileResponse> => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<BulkInviteFileResponse>(`${BASE}bulk-invite-file/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data as BulkInviteFileResponse);
  },

  deactivate: (userId: number): Promise<void> => api.post(`${BASE}${userId}/deactivate/`).then(() => undefined),

  resetPassword: (userId: number): Promise<void> => api.post(`${BASE}${userId}/reset-password/`).then(() => undefined),

  bulkActivate: (userIds: number[]): Promise<BulkToggleResponse> =>
   api.post<{ data: BulkToggleResponse }>(`${BASE}bulk-activate/`, { user_ids: userIds }).then((r) => r.data.data),

  bulkDeactivate: (userIds: number[]): Promise<BulkToggleResponse> =>
   api.post<{ data: BulkToggleResponse }>(`${BASE}bulk-deactivate/`, { user_ids: userIds }).then((r) => r.data.data),

  /** Actions the primary user can grant, with the role defaults a new member gets. */
  availablePermissions: (): Promise<FpoMemberPermission[]> =>
    api.get<{ data: FpoMemberPermission[] }>(`${BASE}available-permissions/`).then((r) => r.data.data),

  getPermissions: (userId: number): Promise<FpoMemberPermission[]> =>
    api
      .get<{ data: { permissions: FpoMemberPermission[] } }>(`${BASE}${userId}/permissions/`)
      .then((r) => r.data.data.permissions),

  /** Grant and/or revoke permissions for several members at once; codes in neither list stay as they are. */
  bulkPermissions: (userIds: number[], grant: string[], revoke: string[]): Promise<BulkToggleResponse> =>
    api
      .post<{ data: BulkToggleResponse }>(`${BASE}bulk-permissions/`, { user_ids: userIds, grant, revoke })
      .then((r) => r.data.data),

  /** Grant exactly `codes` (replace) — every other grantable action is revoked. */
  setPermissions: (userId: number, codes: string[]): Promise<FpoMemberPermission[]> =>
    api
      .post<{ data: { permissions: FpoMemberPermission[] } }>(`${BASE}${userId}/permissions/`, {
        action: "replace",
        permissions: codes,
      })
      .then((r) => r.data.data.permissions),
};
