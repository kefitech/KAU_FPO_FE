import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface MarketHubInquiry {
  id: number;
  product: number;
  product_name: string;
  /** Batch the inquiry was made on — null for inquiries made before batches were recorded. */
  batch_number: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "suggested" | "accepted" | "rejected" | "completed";
  created_at: string;
}

const BASE = "/marketplace/market-hub-inquiries/";

export const marketHubInquiriesApi = {
  getAll: (params: DataTableParams): Promise<PaginatedResponse<MarketHubInquiry>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<MarketHubInquiry>),

  markAccepted: (id: number): Promise<void> =>
    api.post(`${BASE}${id}/mark-accepted/`).then(() => undefined),

  markRejected: (id: number): Promise<void> =>
    api.post(`${BASE}${id}/mark-rejected/`).then(() => undefined),
};