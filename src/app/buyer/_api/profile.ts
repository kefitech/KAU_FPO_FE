import { api } from "@/lib/api/client";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export interface BuyerProfileData {
  location: string;
  commodities_interested: string[];
  min_quantity: string | null;
  max_quantity: string | null;
  unit: string;
}

export interface BuyerProfileUpdatePayload {
  location?: string;
  commodities_interested?: string[];
  min_quantity?: number | string | null;
  max_quantity?: number | string | null;
  unit?: string;
}

const BASE = "/marketplace/buyer/profile/";

export const buyerProfileApi = {
  get: () => api.get<Wrapped<BuyerProfileData>>(BASE).then(unwrap),

  update: (payload: BuyerProfileUpdatePayload) =>
    api.patch<Wrapped<BuyerProfileData>>(BASE, payload).then(unwrap),
};
