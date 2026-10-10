"use client";
import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type ExpertBooking, expertDashboardApi } from "@/app/expert/_api/dashboard";
import { compareBookings } from "@/app/expert/booking/_lib/order";
import { BackButton } from "@/components/layout/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function FpoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fpoId = Number(params.fpoId);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["expert-my-bookings"],
    queryFn: () => expertDashboardApi.getMyBookings(),
  });

  // Same order as the My Bookings cards: upcoming soonest-first, then finished ones newest-first.
  const fpoBookings = bookings.filter((b) => b.fpo === fpoId).sort(compareBookings);

  // Links from elsewhere (e.g. the availability page's cancellation dialog)
  // point at /expert/booking/fpo/<id>#booking-<bookingId>. The cards only
  // exist once the query resolves, so the browser's own hash scroll misses;
  // scroll and highlight here instead.
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  useEffect(() => {
    if (isLoading || bookings.length === 0) return;
    const match = /^#booking-(\d+)$/.exec(window.location.hash);
    if (!match) return;
    const id = Number(match[1]);
    const el = document.getElementById(`booking-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightedId(id);
  }, [isLoading, bookings]);

  const confirmMutation = useMutation({
    mutationFn: (id: number) => expertDashboardApi.confirmBooking(id),
    onSuccess: () => {
      toast.success("Booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    // A 400 here means the slot filled up or disappeared while this request waited.
    onError: (error) => toast.error(getErrorMessage(error, "Failed to confirm booking")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertDashboardApi.rejectBooking(id, reason),
    onSuccess: () => {
      toast.success("Booking rejected");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
      setRejectDialog({ open: false, booking: null }); // 👈 add this line
      setRejectReason(""); // 👈 add this line
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to reject booking")),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertDashboardApi.cancelBooking(id, reason),
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
      setCancelDialog({ open: false, booking: null }); // 👈 add this
      setCancelReason(""); // 👈 add this
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to cancel booking")),
  });

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; booking: ExpertBooking | null }>({
    open: false,
    booking: null,
  });
  const [rejectReason, setRejectReason] = useState("");

  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: ExpertBooking | null }>({
    open: false,
    booking: null,
  });
  const [cancelReason, setCancelReason] = useState("");

  function handleReject(booking: ExpertBooking) {
    setRejectReason("");
    setRejectDialog({ open: true, booking });
  }

  function submitReject() {
    if (!rejectDialog.booking) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for rejecting this booking.");
      return;
    }
    rejectMutation.mutate({ id: rejectDialog.booking.id, reason: trimmedReason });
  }

  function handleCancel(booking: ExpertBooking) {
    setCancelReason("");
    setCancelDialog({ open: true, booking });
  }

  function submitCancel() {
    if (!cancelDialog.booking) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for cancelling this booking.");
      return;
    }
    cancelMutation.mutate({ id: cancelDialog.booking.id, reason: trimmedReason });
  }
  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  if (fpoBookings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton className="self-start" onClick={() => router.push("/expert/booking")} />
        <p className="text-muted-foreground text-sm">No bookings found for this FPO.</p>
      </div>
    );
  }

  const first = fpoBookings[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Same control as the admin pages; returns to the My Bookings list */}
      <BackButton className="self-start" onClick={() => router.push("/expert/booking")} />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{first.fpo_name}</CardTitle>
          <p className="text-muted-foreground text-sm">{fpoBookings.length} booking(s) with you</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {first.fpo_application_id && (
            <p className="text-muted-foreground text-sm">Application ID: {first.fpo_application_id}</p>
          )}
          {first.fpo_contact_name && <p className="text-muted-foreground text-sm">Contact: {first.fpo_contact_name}</p>}
          {first.fpo_email && <p className="text-muted-foreground text-sm">Email: {first.fpo_email}</p>}
          {first.fpo_phone && <p className="text-muted-foreground text-sm">Phone: {first.fpo_phone}</p>}
          {first.fpo_location && <p className="text-muted-foreground text-sm">Location: {first.fpo_location}</p>}
          {first.fpo_district && <p className="text-muted-foreground text-sm">District: {first.fpo_district}</p>}
          {first.fpo_registration_number && (
            <p className="text-muted-foreground text-sm">Registration No.: {first.fpo_registration_number}</p>
          )}
          {first.fpo_total_members != null && (
            <p className="text-muted-foreground text-sm">Members: {first.fpo_total_members}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Booking History</h3>
        {fpoBookings.map((booking) => (
          <Card
            key={booking.id}
            id={`booking-${booking.id}`}
            className={cn("scroll-mt-20", highlightedId === booking.id && "ring-2 ring-primary")}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {booking.requested_date} at {booking.requested_time}
              </CardTitle>
              <Badge className={STATUS_COLORS[booking.status]}>{booking.status_display}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {booking.user_name && (
                <p className="text-sm">
                  Booked by: {booking.user_name}
                  {booking.user_email && <span className="text-muted-foreground"> · {booking.user_email}</span>}
                  {booking.user_phone && <span className="text-muted-foreground"> · {booking.user_phone}</span>}
                </p>
              )}
              {booking.topic && <p className="text-muted-foreground text-sm">Topic: {booking.topic}</p>}
              {booking.notes && <p className="text-muted-foreground text-sm">Notes: {booking.notes}</p>}
              {booking.cancellation_reason && (
                <p className="text-muted-foreground text-xs">Reason: {booking.cancellation_reason}</p>
              )}
              {booking.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(booking.id)}
                    disabled={confirmMutation.isPending}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(booking)}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {booking.status === "confirmed" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCancel(booking)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for rejecting this booking?</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Let the FPO know why you cannot accept this appointment"
            rows={4}
            className="max-h-40 overflow-y-auto"
            maxLength={1000}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectDialog({ open: false, booking: null })}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for cancelling this confirmed booking?</DialogTitle>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Let the FPO know why this confirmed appointment is being cancelled"
            rows={4}
            className="max-h-40 overflow-y-auto"
            maxLength={1000}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelDialog({ open: false, booking: null })}>
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitCancel}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
