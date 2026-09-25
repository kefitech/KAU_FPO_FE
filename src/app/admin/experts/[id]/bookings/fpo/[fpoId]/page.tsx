"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import type { ExpertBooking } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

type Booking = ExpertBooking & {
  requested_time?: string | null;
  time_slot_display?: string | null;
  topic?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
};

function toBookingArray(data: unknown): Booking[] {
  let cur: unknown = data;
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(cur)) return cur as Booking[];
    const obj = cur as { results?: unknown; data?: unknown } | null | undefined;
    cur = obj?.results ?? obj?.data;
  }
  return Array.isArray(cur) ? (cur as Booking[]) : [];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [h, m] = value.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m ?? 0));
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function AdminExpertFpoBookingsPage() {
  const params = useParams<{ id: string; fpoId: string }>();
  const id = params?.id;
  const fpoId = Number(params?.fpoId);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_dashboard,common")
      .then((data) => setT({ ...(data.common ?? {}), ...(data.expert_dashboard ?? {}) }))
      .catch(() => undefined);
  }, [locale]);

  // Same query key as page 1 → uses cached data, no extra request
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["experts", id, "bookings"],
    queryFn: () => adminExpertsApi.bookings(id as string),
    enabled: Boolean(id),
  });

  function getStatusLabel(status?: string, fallback?: string) {
    if (!status) return fallback ?? "";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t.loading ?? "Loading bookings..."}</p>;
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        {(error as { message?: string })?.message ?? "Failed to load bookings"}
      </p>
    );
  }

  const fpoBookings = toBookingArray(data)
    .filter((b) => b.fpo === fpoId)
    .sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime());

  const first = fpoBookings[0];
  const visible = fpoBookings.filter((b) => filterStatus === "all" || b.status === filterStatus);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl">{first?.fpo_name ?? t.fpo_bookings_title ?? "FPO Bookings"}</h2>
          <p className="text-muted-foreground text-sm">
            {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(fpoBookings.length))}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/experts/${id}/bookings`}>{t.btn_back ?? "Back"}</Link>
        </Button>
      </div>

      {/* FPO details */}
      {first && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.fpo_details ?? "FPO Details"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 sm:grid-cols-2">
            {first.fpo_application_id && (
              <p className="text-muted-foreground text-xs">
                {t.field_application_id ?? "Application ID"}: {first.fpo_application_id}
              </p>
            )}
            {first.fpo_contact_name && (
              <p className="text-muted-foreground text-xs">
                {t.field_contact ?? "Contact"}: {first.fpo_contact_name}
              </p>
            )}
            {first.fpo_email && (
              <p className="text-muted-foreground text-xs">
                {t.field_email ?? "Email"}: {first.fpo_email}
              </p>
            )}
            {first.fpo_phone && (
              <p className="text-muted-foreground text-xs">
                {t.field_phone ?? "Phone"}: {first.fpo_phone}
              </p>
            )}
            {first.fpo_location && (
              <p className="text-muted-foreground text-xs">
                {t.field_location ?? "Location"}: {first.fpo_location}
              </p>
            )}
            {first.fpo_district && (
              <p className="text-muted-foreground text-xs">
                {t.field_district ?? "District"}: {first.fpo_district}
              </p>
            )}
            {first.fpo_registration_number && (
              <p className="text-muted-foreground text-xs">
                {t.field_registration_number ?? "Registration No."}: {first.fpo_registration_number}
              </p>
            )}
            {first.fpo_total_members != null && (
              <p className="text-muted-foreground text-xs">
                {t.field_total_members ?? "Members"}: {first.fpo_total_members}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground text-xs" htmlFor="fpo-filter-status">
          {t.filter_status ?? "Status"}
        </label>
        <select
          id="fpo-filter-status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="all">{t.filter_status_all ?? "All"}</option>
          <option value="pending">{t.status_pending ?? "Pending"}</option>
          <option value="confirmed">{t.status_confirmed ?? "Confirmed"}</option>
          <option value="rejected">{t.status_rejected ?? "Rejected"}</option>
          <option value="cancelled">{t.status_cancelled ?? "Cancelled"}</option>
          <option value="completed">{t.status_completed ?? "Completed"}</option>
        </select>
      </div>

      {/* Date list */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No bookings found."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">
                    {formatDate(b.requested_date)}
                    {b.requested_time && (
                      <span className="text-muted-foreground"> · {formatTime(b.requested_time)}</span>
                    )}
                    {b.time_slot_display && <span className="text-muted-foreground"> · {b.time_slot_display}</span>}
                  </p>
                  {b.topic && (
                    <p className="text-sm">
                      {t.field_topic ?? "Topic"}: {b.topic}
                    </p>
                  )}
                  {b.notes && (
                    <p className="text-muted-foreground text-xs">
                      {t.field_notes ?? "Notes"}: {b.notes}
                    </p>
                  )}
                  {b.cancellation_reason && (
                    <p className="text-destructive text-xs">
                      {t.field_reason ?? "Reason"}: {b.cancellation_reason}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {t.field_created_at ?? "Booked on"}: {new Date(b.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge className={`w-fit ${STATUS_COLORS[b.status] ?? ""}`}>
                  {getStatusLabel(b.status, b.status_display)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
