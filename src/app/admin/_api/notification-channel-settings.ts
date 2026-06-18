import { api } from "@/lib/api/client";
import type { ChannelSetting, ChannelSettingPayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/notifications/channel-settings/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const channelSettingsApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<ChannelSetting>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<ChannelSetting>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: ChannelSettingPayload) => api.post<ChannelSetting>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<ChannelSettingPayload>) =>
    api.patch<ChannelSetting>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),

  test: (id: number, recipient: string, message: string) =>
    api.post(`${BASE}${id}/test/`, { recipient, message }).then((r) => r.data),
};
