import { api } from "@/lib/api/client";
import type { FpoExpert } from "@/types/fpo";
import type { PaginatedResponse } from "@/types/pagination";

export interface AvailabilitySlot {
  id: number;
  start: string;
  end: string;
  max_bookings?: number;
  confirmed_count?: number;
  is_booked?: boolean;
}

export interface ExpertAvailabilityDay {
  id: number;
  date: string;
  time_slots: AvailabilitySlot[];
  /** Set when the current user already holds an appointment on this date (with any expert): one per day. */
  my_booking?: { expert_name: string; time: string } | null;
}

export interface ExpertBooking {
  id: number;
  expert: number;
  expert_name: string;
  fpo: number;
  fpo_name: string;
  /** The FPO member who made the booking; null on rows older than per-user booking. */
  user: number | null;
  user_name: string | null;
  /** Set by the backend for the current user: their own booking, or any in the FPO they own. */
  can_cancel: boolean;
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
  list: (params?: {
    category?: string;
    district?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<FpoExpert>> =>
    api.get<PaginatedResponse<FpoExpert>>("/experts/", { params }).then((r) => r.data),
  get: (id: number): Promise<FpoExpert> =>
    api.get<{ status: string; data: FpoExpert }>(`/experts/${id}/`).then((r) => r.data.data),
  sendEnquiry: (id: number, message: string): Promise<{ enquiry_id: number; email_sent: boolean }> =>
    api
      .post<{ status: string; data: { enquiry_id: number; email_sent: boolean } }>(`/experts/${id}/enquiry/`, {
        message,
      })
      .then((r) => r.data.data),
  getAvailability: (id: number): Promise<ExpertAvailabilityDay[]> =>
    api.get<{ status: string; data: ExpertAvailabilityDay[] }>(`/experts/${id}/availability/`).then((r) => r.data.data),
  bookSlot: (
    id: number,
    payload: { requested_date: string; requested_time: string; time_slot_id?: number; topic?: string; notes?: string },
  ): Promise<ExpertBooking> =>
    api.post<{ status: string; data: ExpertBooking }>(`/experts/${id}/book/`, payload).then((r) => r.data.data),
  cancelBooking: (bookingId: number, reason?: string): Promise<ExpertBooking> =>
    api
      .post<{ status: string; data: ExpertBooking }>(`/experts/bookings/${bookingId}/cancel/`, { reason })
      .then((r) => r.data.data),

  /** My own bookings by default; `scope: "fpo"` returns every member's bookings in my FPO. */
  listMyBookings: (params?: { expert?: number; status?: string; scope?: "mine" | "fpo" }): Promise<ExpertBooking[]> =>
    api.get<{ status: string; data: ExpertBooking[] }>("/experts/bookings/", { params }).then((r) => r.data.data),
};
