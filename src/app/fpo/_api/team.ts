import { api } from "@/lib/api/client";
import type { FpoBulkInvitePayload, FpoTeamInvitePayload, FpoTeamMember } from "@/types/fpo";

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

  bulkActivate: (userIds: number[]): Promise<void> =>
    api.post(`${BASE}bulk-activate/`, { user_ids: userIds }).then(() => undefined),

  bulkDeactivate: (userIds: number[]): Promise<void> =>
    api.post(`${BASE}bulk-deactivate/`, { user_ids: userIds }).then(() => undefined),
};
