import { api } from "@/lib/api/client";
import type { FpoExpert } from "@/types/fpo";

type ListResponse = { status: string; data: FpoExpert[] };

export interface AvailabilitySlot {
  start: string;
  end: string;
  is_booked?: boolean;
}

export interface ExpertAvailabilityDay {
  id: number;
  date: string;
  time_slots: AvailabilitySlot[];
}

export interface ExpertBooking {
  id: number;
  expert: number;
  expert_name: string;
  fpo: number;
  fpo_name: string;
  requested_date: string;
  requested_time: string;
  topic: string;
  notes: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  status_display: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

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
  getAvailability: (id: number): Promise<ExpertAvailabilityDay[]> =>
    api
      .get<{ status: string; data: ExpertAvailabilityDay[] }>(`/experts/${id}/availability/`)
      .then((r) => r.data.data),
  bookSlot: (id: number, payload: { requested_date: string; requested_time: string; topic?: string; notes?: string }): Promise<ExpertBooking> =>
    api
      .post<{ status: string; data: ExpertBooking }>(`/experts/${id}/book/`, payload)
      .then((r) => r.data.data),
  cancelBooking: (bookingId: number, reason?: string): Promise<ExpertBooking> =>
    api
      .post<{ status: string; data: ExpertBooking }>(`/experts/bookings/${bookingId}/cancel/`, { reason })
      .then((r) => r.data.data),
};
