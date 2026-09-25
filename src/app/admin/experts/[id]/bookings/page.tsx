"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import type { ExpertBooking } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
};

function toBookingArray(data: unknown): ExpertBooking[] {
  let cur: unknown = data;
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(cur)) return cur as ExpertBooking[];
    const obj = cur as { results?: unknown; data?: unknown } | null | undefined;
    cur = obj?.results ?? obj?.data;
  }
  return Array.isArray(cur) ? (cur as ExpertBooking[]) : [];
}

export default function AdminExpertBookingsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_dashboard,common")
      .then((data) => setT({ ...(data.common ?? {}), ...(data.expert_dashboard ?? {}) }))
      .catch(() => undefined);
  }, [locale]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["experts", id, "bookings"],
    queryFn: () => adminExpertsApi.bookings(id as string),
    enabled: Boolean(id),
  });

  const bookings = toBookingArray(data);

  function getStatusLabel(status?: string, fallback?: string) {
    if (!status) return fallback ?? "";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  function openFpo(fpoId: number) {
    router.push(`/admin/experts/${id}/bookings/fpo/${fpoId}`);
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t.loading ?? "Loading bookings..."}</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-destructive text-sm">
          {(error as { message?: string })?.message ?? "Failed to load bookings"}
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/admin/experts">{t.btn_back ?? "Back"}</Link>
        </Button>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterDateFrom && b.requested_date < filterDateFrom) return false;
    if (filterDateTo && b.requested_date > filterDateTo) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!`${b.fpo_name ?? ""} ${b.fpo_district ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const groupedByFpo: Record<number, ExpertBooking[]> = {};
  for (const b of filteredBookings) {
    if (!groupedByFpo[b.fpo]) groupedByFpo[b.fpo] = [];
    groupedByFpo[b.fpo].push(b);
  }

  const fpoGroups = Object.values(groupedByFpo)
    .map((group) => [...group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    .sort((a, b) => {
      const aPending = a.some((x) => x.status === "pending");
      const bPending = b.some((x) => x.status === "pending");
      if (aPending !== bPending) return aPending ? -1 : 1;
      return new Date(b[0].requested_date).getTime() - new Date(a[0].requested_date).getTime();
    });

  const hasFilters = filterStatus !== "all" || !!filterDateFrom || !!filterDateTo || !!filterSearch;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl">{t.admin_bookings_title ?? "Expert Bookings"}</h2>
          <p className="text-muted-foreground text-sm">
            {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(bookings.length))}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/experts">{t.btn_back ?? "Back"}</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-status">
            {t.filter_status ?? "Status"}
          </label>
          <select
            id="filter-status"
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
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-from">
            {t.filter_from ?? "From"}
          </label>
          <input
            id="filter-from"
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-to">
            {t.filter_to ?? "To"}
          </label>
          <input
            id="filter-to"
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-search">
            {t.filter_search ?? "FPO name or district"}
          </label>
          <input
            id="filter-search"
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder={t.filter_search_placeholder ?? "Search..."}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        {hasFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterStatus("all");
              setFilterDateFrom("");
              setFilterDateTo("");
              setFilterSearch("");
            }}
          >
            {t.filter_clear ?? "Clear filters"}
          </Button>
        )}
      </div>

      {bookings.length === 0 && (
        <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No bookings yet."}</p>
      )}
      {fpoGroups.length === 0 && bookings.length > 0 && (
        <p className="text-muted-foreground text-sm">{t.empty_no_matches ?? "No bookings match your filters."}</p>
      )}

      {/* FPO cards — click to open date list */}
      {fpoGroups.map((group) => {
        const first = group[0];
        return (
          <Card
            key={first.fpo}
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => openFpo(first.fpo)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFpo(first.fpo);
              }
            }}
          >
            <CardHeader>
              <CardTitle className="text-base">{first.fpo_name}</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-xs">
                  {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(group.length))}
                </p>
                <Badge className={STATUS_COLORS[first.status] ?? ""}>
                  {getStatusLabel(first.status, first.status_display)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1 sm:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
