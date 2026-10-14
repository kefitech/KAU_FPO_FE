"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import type { ExpertBooking } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { byUpcomingDate } from "@/lib/booking-order";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const PAGE_SIZE = 10;

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
  cancelled: "bg-red-100 text-red-800",
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
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // The page belongs to the filter set it was chosen under, so changing any
  // filter drops back to page 1.
  const filterKey = `${filterStatus}|${filterDateFrom}|${filterDateTo}`;
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ filterKey, page: next });

  const hasFilters = filterStatus !== "all" || !!filterDateFrom || !!filterDateTo;
  function clearFilters() {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

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
    .sort(byUpcomingDate());

  const first = fpoBookings[0];

  const filtered = fpoBookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterDateFrom && b.requested_date < filterDateFrom) return false;
    if (filterDateTo && b.requested_date > filterDateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="flex flex-col gap-1">
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
            <option value="confirmed">{t.status_confirmed ?? "Confirmed"}</option>
            <option value="completed">{t.status_completed ?? "Completed"}</option>
            <option value="cancelled">{t.status_cancelled ?? "Cancelled"}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="fpo-filter-from">
            {t.filter_from ?? "From"}
          </label>
          <input
            id="fpo-filter-from"
            type="date"
            value={filterDateFrom}
            max={filterDateTo || undefined}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="fpo-filter-to">
            {t.filter_to ?? "To"}
          </label>
          <input
            id="fpo-filter-to"
            type="date"
            value={filterDateTo}
            min={filterDateFrom || undefined}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        {hasFilters && (
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
            {t.filter_clear ?? "Clear filters"}
          </Button>
        )}
      </div>

      {/* Date list */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {fpoBookings.length === 0
            ? (t.empty_no_bookings ?? "No bookings found.")
            : (t.empty_no_matches ?? "No bookings match your filters.")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="wrap-anywhere flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-medium">
                    {formatDate(b.requested_date)}
                    {b.requested_time && (
                      <span className="text-muted-foreground"> · {formatTime(b.requested_time)}</span>
                    )}
                    {b.time_slot_display && <span className="text-muted-foreground"> · {b.time_slot_display}</span>}
                  </p>
                  {b.user_name && (
                    <p className="text-sm">
                      {t.field_booked_by ?? "Booked by"}: {b.user_name}
                      {b.user_email && <span className="text-muted-foreground"> · {b.user_email}</span>}
                    </p>
                  )}
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
                <Badge className={`w-fit shrink-0 ${STATUS_COLORS[b.status] ?? ""}`}>
                  {getStatusLabel(b.status, b.status_display)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-muted-foreground text-sm">
          {(t.pagination_summary_bookings ?? "Page {page} of {total_pages} · {count} bookings")
            .replace("{page}", String(currentPage))
            .replace("{total_pages}", String(totalPages))
            .replace("{count}", String(filtered.length))}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t.btn_previous ?? "Previous"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            {t.btn_next ?? "Next"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
