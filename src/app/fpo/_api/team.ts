import { api } from "@/lib/api/client";
import type { FpoBulkInvitePayload, FpoTeamInvitePayload, FpoTeamMember } from "@/types/fpo";

const BASE = "/fpo/me/team/";

type ListResponse = FpoTeamMember[] | { status: string; message: string; data: FpoTeamMember[] };

export const fpoTeamApi = {
  list: (): Promise<FpoTeamMember[]> =>
    api.get<ListResponse>(BASE).then((r) =>
      Array.isArray(r.data) ? r.data : r.data.data ?? [],
    ),

  invite: (payload: FpoTeamInvitePayload): Promise<void> =>
    api.post(`${BASE}invite/`, payload).then(() => undefined),

  bulkInvite: (payload: FpoBulkInvitePayload): Promise<void> =>
    api.post(`${BASE}bulk-invite/`, payload).then(() => undefined),

  bulkInviteFile: (file: File): Promise<void> => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`${BASE}bulk-invite-file/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(() => undefined);
  },

  deactivate: (userId: number): Promise<void> =>
    api.post(`${BASE}${userId}/deactivate/`).then(() => undefined),

  resetPassword: (userId: number): Promise<void> =>
    api.post(`${BASE}${userId}/reset-password/`).then(() => undefined),

  bulkActivate: (userIds: number[]): Promise<void> =>
    api.post(`${BASE}bulk-activate/`, { user_ids: userIds }).then(() => undefined),

  bulkDeactivate: (userIds: number[]): Promise<void> =>
    api.post(`${BASE}bulk-deactivate/`, { user_ids: userIds }).then(() => undefined),
};
