import { apiClient } from "@/lib/api/client"; // adjust to your actual client import

export interface BuyerDashboardData {
  id: number;
  name: string;
  organisation: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  commodities_interested: string[];
  status: "pending" | "verified" | "rejected";
  buyer_type: "external" | "fpo";
  created_at: string;
  stats: BuyerDashboardStats;
}

export type BuyerInquiryStatus = "pending" | "contacted" | "resolved";

/** Matches build_buyer_stats() in apps/marketplace/api/buyer_dashboard.py */
export interface BuyerDashboardStats {
  cards: {
    products_available: number;
    fpos_selling: number;
    matching_interests: number;
    new_this_week: number;
    inquiries_total: number;
    inquiries_pending: number;
    inquiries_responded: number;
    /** null when no inquiries yet */
    response_rate: number | null;
    fpos_contacted: number;
    expiring_soon: number;
  };
  inquiry_status: Record<BuyerInquiryStatus, number>;
  /** Last 6 months, oldest first; month = "YYYY-MM" */
  inquiry_trend: { month: string; count: number }[];
  /** One row per interested commodity, in profile order */
  supply_by_commodity: {
    code: string;
    name: string;
    listings: number;
    fpos: number;
    prices: { unit: string; min: number | string; max: number | string }[];
  }[];
  recent_inquiries: {
    id: number;
    product_name: { en?: string; ml?: string };
    commodity_name: string;
    fpo_name: string;
    quantity_requested: number | string;
    status: BuyerInquiryStatus;
    created_at: string;
    updated_at: string;
  }[];
}

export const buyerDashboardApi = {
  get: async (): Promise<BuyerDashboardData> => {
    const res = await apiClient.get("/marketplace/buyer/dashboard/");
    return res.data.data;
  },
};
