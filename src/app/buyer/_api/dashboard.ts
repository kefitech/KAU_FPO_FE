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
}

export const buyerDashboardApi = {
  get: async (): Promise<BuyerDashboardData> => {
    const res = await apiClient.get("/marketplace/buyer/dashboard/");
    return res.data.data;
  },
};
