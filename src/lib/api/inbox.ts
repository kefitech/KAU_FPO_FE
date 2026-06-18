import { api } from "@/lib/api/client";
import type { InboxNotification, InboxUnreadCount } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/notifications/inbox/";

export const inboxApi = {
  getAll: (params?: Partial<DataTableParams>) =>
    api.get<PaginatedResponse<InboxNotification>>(BASE, { params }).then((r) => r.data),

  getOne: (id: number) => api.get<InboxNotification>(`${BASE}${id}/`).then((r) => r.data),

  markRead: (id: number) => api.post<InboxNotification>(`${BASE}${id}/read/`).then((r) => r.data),

  markAllRead: () => api.post(`${BASE}read_all/`).then((r) => r.data),

  unreadCount: () => api.get<InboxUnreadCount>(`${BASE}unread_count/`).then((r) => r.data),
};
