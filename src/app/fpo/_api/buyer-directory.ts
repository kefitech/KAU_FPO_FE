import { api } from "@/lib/api/client";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/marketplace/buyers/";

export interface BuyerStatus {
  registered: boolean;
  status?: "pending" | "verified" | "rejected" | null;
  id?: number;
  name?: string;
  organisation?: string;
}

export const buyerDirectoryApi = {
  getMyStatus: () => api.get<Wrapped<BuyerStatus>>(`${BASE}my-status/`).then(unwrap),

  register: () => api.post<Wrapped<BuyerStatus>>(`${BASE}register/`).then(unwrap),
};
