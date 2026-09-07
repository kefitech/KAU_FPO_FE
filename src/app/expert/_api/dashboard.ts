import { api } from "@/lib/api/client";

type Wrapped<T> = { status: string; message: string; data: T };

export interface ExpertBooking {
  id: number;
  expert: number;
  expert_name: string;
  fpo: number;
  fpo_name: string;
  fpo_email: string | null;
  fpo_phone: string | null;
  fpo_application_id: string | null;
  fpo_location: string | null;
  fpo_contact_name: string | null;
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

export interface AvailabilitySlot {
  start: string;
  end: string;
  is_booked?: boolean;
}

export interface AvailabilityDay {
  id: number;
  date: string;
  time_slots: AvailabilitySlot[];
}

export const expertDashboardApi = {
    getMyProfile: (): Promise<{ id: number; name_en: string; designation: string }> =>
    api.get<Wrapped<{ id: number; name_en: string; designation: string }>>("/experts/me/").then((r) => r.data.data),
    
  getMyBookings: (params?: { status?: string }): Promise<ExpertBooking[]> =>
    api.get<Wrapped<ExpertBooking[]>>("/experts/admin/bookings/", { params }).then((r) => r.data.data),

  confirmBooking: (bookingId: number): Promise<ExpertBooking> =>
    api.post<Wrapped<ExpertBooking>>(`/experts/admin/bookings/${bookingId}/confirm/`).then((r) => r.data.data),

  rejectBooking: (bookingId: number, reason: string): Promise<ExpertBooking> =>
    api.post<Wrapped<ExpertBooking>>(`/experts/admin/bookings/${bookingId}/reject/`, { reason }).then((r) => r.data.data),

  rescheduleBooking: (bookingId: number, payload: { new_date: string; new_time: string; reason?: string }): Promise<ExpertBooking> =>
    api.post<Wrapped<ExpertBooking>>(`/experts/admin/bookings/${bookingId}/reschedule/`, payload).then((r) => r.data.data),

  setAvailability: (expertId: number, slots: { date: string; time_slots: { start: string; end: string }[] }[]): Promise<AvailabilityDay[]> =>
    api.post<Wrapped<AvailabilityDay[]>>(`/experts/admin/${expertId}/availability/`, { slots }).then((r) => r.data.data),
};