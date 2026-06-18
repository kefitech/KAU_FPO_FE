import { api } from "@/lib/api/client";
import type { FpoExpert } from "@/types/fpo";

type ListResponse = { status: string; data: FpoExpert[] };

export const expertsApi = {
  list: (params?: { category?: string; district?: string; search?: string }): Promise<FpoExpert[]> =>
    api.get<ListResponse>("/experts/", { params }).then((r) => r.data.data),

  get: (id: number): Promise<FpoExpert> =>
    api.get<{ status: string; data: FpoExpert }>(`/experts/${id}/`).then((r) => r.data.data),

  sendEnquiry: (id: number, message: string): Promise<{ enquiry_id: number; email_sent: boolean }> =>
    api
      .post<{ status: string; data: { enquiry_id: number; email_sent: boolean } }>(`/experts/${id}/enquiry/`, {
        message,
      })
      .then((r) => r.data.data),
};
