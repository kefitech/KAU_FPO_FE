"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    rejectMutation.mutate({ id: rejectDialog.booking.id, reason: rejectReason });
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
    group.sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime());
  });

  const fpoGroups = Object.values(groupedByFpo).sort((a, b) => {
    const aHasPending = a.some((x) => x.status === "pending");
    const bHasPending = b.some((x) => x.status === "pending");
    if (aHasPending !== bHasPending) return aHasPending ? -1 : 1;
    return new Date(b[0].requested_date).getTime() - new Date(a[0].requested_date).getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">{t.page_title ?? "My Bookings"}</h2>
        <p className="text-muted-foreground text-sm">{t.page_description ?? "Manage your appointment requests"}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-status">{t.filter_status ?? "Status"}</label>
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
          <label className="text-muted-foreground text-xs" htmlFor="filter-from">{t.filter_from ?? "From"}</label>
          <input
            id="filter-from"
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-to">{t.filter_to ?? "To"}</label>
          <input
            id="filter-to"
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="filter-search">{t.filter_search ?? "FPO name or district"}</label>
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

      {bookings.length === 0 && <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No bookings yet."}</p>}

      {fpoGroups.length === 0 && bookings.length > 0 && (
        <p className="text-muted-foreground text-sm">{t.empty_no_matches ?? "No bookings match your filters."}</p>
      )}

      {fpoGroups.map((group) => {
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
              
              <div className="flex items-center gap-2">
        
                <p className="text-muted-foreground text-xs">
                  {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(group.length))}
                </p>
                <Badge className={STATUS_COLORS[first.status]}>{getStatusLabel(first.status, first.status_display)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 border-b pb-3">
                {first.fpo_application_id && (
                  <p className="text-muted-foreground text-xs">{t.field_application_id ?? "Application ID"}: {first.fpo_application_id}</p>
                )}
                {first.fpo_contact_name && (
                  <p className="text-muted-foreground text-xs">{t.field_contact ?? "Contact"}: {first.fpo_contact_name}</p>
                )}
                {first.fpo_email && <p className="text-muted-foreground text-xs">{t.field_email ?? "Email"}: {first.fpo_email}</p>}
                {first.fpo_phone && <p className="text-muted-foreground text-xs">{t.field_phone ?? "Phone"}: {first.fpo_phone}</p>}
                {first.fpo_location && (
                  <p className="text-muted-foreground text-xs">{t.field_location ?? "Location"}: {first.fpo_location}</p>
                )}
                {first.fpo_district && (
                  <p className="text-muted-foreground text-xs">{t.field_district ?? "District"}: {first.fpo_district}</p>
                )}
                {first.fpo_registration_number && (
                  <p className="text-muted-foreground text-xs">{t.field_registration_number ?? "Registration No."}: {first.fpo_registration_number}</p>
                )}
                {first.fpo_total_members != null && (
                  <p className="text-muted-foreground text-xs">{t.field_total_members ?? "Members"}: {first.fpo_total_members}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

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
            <Button type="button" variant="destructive" onClick={submitReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? (t.btn_rejecting ?? "Rejecting...") : (t.btn_reject_booking ?? "Reject Booking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
