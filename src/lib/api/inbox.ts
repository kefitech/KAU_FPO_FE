import { api } from "@/lib/api/client";
import type { InboxCategories, InboxCategory, InboxNotification, InboxUnreadCount } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/notifications/inbox/";

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export const inboxApi = {
  getAll: (params?: Partial<DataTableParams>) =>
    api.get<PaginatedResponse<InboxNotification>>(BASE, { params }).then((r) => r.data),

  getOne: (id: number) => api.get<InboxNotification>(`${BASE}${id}/`).then((r) => r.data),

  markRead: (id: number) => api.post<InboxNotification>(`${BASE}${id}/read/`).then((r) => r.data),

  /** Omit `category` to mark every notification read. */
  markAllRead: (category?: InboxCategory) =>
    api.post(`${BASE}read_all/`, undefined, { params: category ? { category } : undefined }).then((r) => r.data),

  /** Per-category total + unread counts for the inbox tabs. */
  categories: () => api.get<ApiResponse<InboxCategories>>(`${BASE}categories/`).then((r) => r.data),

  unreadCount: () => api.get<ApiResponse<InboxUnreadCount>>(`${BASE}unread_count/`).then((r) => r.data),
};
