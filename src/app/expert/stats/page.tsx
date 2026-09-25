"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { type ExpertBooking, expertDashboardApi } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function ExpertDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_dashboard,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.expert_dashboard ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["expert-my-bookings"],
    queryFn: () => expertDashboardApi.getMyBookings(),
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // The page belongs to the filter set it was chosen under, so changing any
  // filter drops back to page 1.
  const filterKey = `${filterStatus}|${filterDateFrom}|${filterDateTo}|${filterSearch}`;
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ filterKey, page: next });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => expertDashboardApi.confirmBooking(id),
    onSuccess: () => {
      toast.success(t.toast_confirmed ?? "Booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    onError: () => toast.error(t.toast_confirm_failed ?? "Failed to confirm booking"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertDashboardApi.rejectBooking(id, reason),
    onSuccess: () => {
      toast.success(t.toast_rejected ?? "Booking rejected");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    onError: () => toast.error(t.toast_reject_failed ?? "Failed to reject booking"),
  });

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; booking: ExpertBooking | null }>({
    open: false,
    booking: null,
  });
  const [rejectReason, setRejectReason] = useState("");

  function handleReject(booking: ExpertBooking) {
    setRejectReason("");
    setRejectDialog({ open: true, booking });
  }

  function submitReject() {
    if (!rejectDialog.booking) return;
    const trimmedReason = rejectReason.trim();
    if (trimmedReason.length === 0) {
      toast.error(t.toast_reason_required ?? "Please provide a reason for rejecting this booking.");
      return; // <-- hard stop, mutation.mutate() is never called
    }
    rejectMutation.mutate({ id: rejectDialog.booking.id, reason: trimmedReason });
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t.loading ?? "Loading your bookings..."}</p>;
  }

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterDateFrom && b.requested_date < filterDateFrom) return false;
    if (filterDateTo && b.requested_date > filterDateTo) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const haystack = `${b.fpo_name ?? ""} ${b.fpo_district ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const groupedByFpo = filteredBookings.reduce<Record<number, ExpertBooking[]>>((acc, b) => {
    if (!acc[b.fpo]) acc[b.fpo] = [];
    acc[b.fpo].push(b);
    return acc;
  }, {});

  Object.values(groupedByFpo).forEach((group) => {
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  const fpoGroups = Object.values(groupedByFpo).sort((a, b) => {
    const aHasPending = a.some((x) => x.status === "pending");
    const bHasPending = b.some((x) => x.status === "pending");
    if (aHasPending !== bHasPending) return aHasPending ? -1 : 1;
    return new Date(b[0].requested_date).getTime() - new Date(a[0].requested_date).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(fpoGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedFpoGroups = fpoGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">{t.page_title ?? "My Bookings"}</h2>
        <p className="text-muted-foreground text-sm">{t.page_description ?? "Manage your appointment requests"}</p>
      </div>

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
        {(filterStatus !== "all" || filterDateFrom || filterDateTo || filterSearch) && (
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

      {pagedFpoGroups.map((group) => {
        const first = group[0];
        return (
          <Card
            key={first.fpo}
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => router.push(`/expert/dashboard/fpo/${first.fpo}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/expert/dashboard/fpo/${first.fpo}`);
              }
            }}
          >
            <CardHeader>
              <CardTitle className="text-base">{first.fpo_name}</CardTitle>

              <p className="text-muted-foreground text-xs">
                {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(group.length))}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 border-b pb-3">
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

              {/* Every booking that matches the filters, each with its own status */}
              <div className="flex flex-col gap-2">
                {group.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex min-w-0 flex-col">
                      <span>
                        {b.requested_date} · {b.requested_time}
                      </span>
                      {b.topic && (
                        <span className="truncate text-muted-foreground text-xs">
                          {t.field_topic ?? "Topic"}: {b.topic}
                        </span>
                      )}
                    </div>
                    <Badge className={`shrink-0 ${STATUS_COLORS[b.status] ?? ""}`}>
                      {getStatusLabel(b.status, b.status_display)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {(t.pagination_summary ?? "Page {page} of {total_pages} · {count} FPOs")
              .replace("{page}", String(currentPage))
              .replace("{total_pages}", String(totalPages))
              .replace("{count}", String(fpoGroups.length))}
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
      )}

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog_reject_title ?? "Reason for rejecting this booking?"}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t.dialog_reject_placeholder ?? "Let the FPO know why you cannot accept this appointment"}
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectDialog({ open: false, booking: null })}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitReject}
              disabled={rejectMutation.isPending || rejectReason.trim().length === 0}
            >
              {rejectMutation.isPending
                ? (t.btn_rejecting ?? "Rejecting...")
                : (t.btn_reject_booking ?? "Reject Booking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
