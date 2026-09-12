"use client";
import { useEffect, useState } from "react";

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

  const pending = bookings.filter((b) => b.status === "pending");
  const others = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">{t.page_title ?? "My Bookings"}</h2>
        <p className="text-muted-foreground text-sm">{t.page_description ?? "Manage your appointment requests"}</p>
      </div>

      {bookings.length === 0 && <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No bookings yet."}</p>}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">{t.section_pending ?? "Pending Requests"}</h3>
          {pending.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{booking.fpo_name}</CardTitle>
                <Badge className={STATUS_COLORS[booking.status]}>{getStatusLabel(booking.status, booking.status_display)}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">
                  <span className="font-medium">{booking.requested_date}</span> at{" "}
                  <span className="font-medium">{booking.requested_time}</span>
                </p>
                {booking.fpo_application_id && (
                  <p className="text-muted-foreground text-xs">{t.field_application_id ?? "Application ID"}: {booking.fpo_application_id}</p>
                )}
                {booking.fpo_contact_name && (
                  <p className="text-muted-foreground text-xs">{t.field_contact ?? "Contact"}: {booking.fpo_contact_name}</p>
                )}
                {booking.fpo_email && <p className="text-muted-foreground text-xs">{t.field_email ?? "Email"}: {booking.fpo_email}</p>}
                {booking.fpo_phone && <p className="text-muted-foreground text-xs">{t.field_phone ?? "Phone"}: {booking.fpo_phone}</p>}
                {booking.topic && <p className="text-muted-foreground text-sm">{t.field_topic ?? "Topic"}: {booking.topic}</p>}
                {booking.notes && <p className="text-muted-foreground text-sm">{t.field_notes ?? "Notes"}: {booking.notes}</p>}
                {booking.fpo_location && (
                  <p className="text-muted-foreground text-xs">{t.field_location ?? "Location"}: {booking.fpo_location}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(booking.id)}
                    disabled={confirmMutation.isPending}
                  >
                    {t.btn_confirm ?? "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(booking)}
                    disabled={rejectMutation.isPending}
                  >
                    {t.btn_reject ?? "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">{t.section_past ?? "Past & Other Bookings"}</h3>
          {others.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{booking.fpo_name}</CardTitle>
                <Badge className={STATUS_COLORS[booking.status]}>{getStatusLabel(booking.status, booking.status_display)}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <p className="text-sm">
                  {booking.requested_date} at {booking.requested_time}
                </p>
                {booking.fpo_application_id && (
                  <p className="text-muted-foreground text-xs">{t.field_application_id ?? "Application ID"}: {booking.fpo_application_id}</p>
                )}
                {booking.fpo_contact_name && (
                  <p className="text-muted-foreground text-xs">{t.field_contact ?? "Contact"}: {booking.fpo_contact_name}</p>
                )}
                {booking.fpo_email && <p className="text-muted-foreground text-xs">{t.field_email ?? "Email"}: {booking.fpo_email}</p>}
                {booking.fpo_phone && <p className="text-muted-foreground text-xs">{t.field_phone ?? "Phone"}: {booking.fpo_phone}</p>}
                {booking.topic && <p className="text-muted-foreground text-sm">{t.field_topic ?? "Topic"}: {booking.topic}</p>}
                {booking.notes && <p className="text-muted-foreground text-sm">{t.field_notes ?? "Notes"}: {booking.notes}</p>}
                {booking.fpo_location && (
                  <p className="text-muted-foreground text-xs">{t.field_location ?? "Location"}: {booking.fpo_location}</p>
                )}
                {booking.cancellation_reason && (
                  <p className="text-muted-foreground text-xs">{t.field_reason ?? "Reason"}: {booking.cancellation_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
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
            <Button type="button" variant="destructive" onClick={submitReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? (t.btn_rejecting ?? "Rejecting...") : (t.btn_reject_booking ?? "Reject Booking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
