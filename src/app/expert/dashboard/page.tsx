"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { expertDashboardApi, type ExpertBooking } from "@/app/expert/_api/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function ExpertDashboardPage() {
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["expert-my-bookings"],
    queryFn: () => expertDashboardApi.getMyBookings(),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => expertDashboardApi.confirmBooking(id),
    onSuccess: () => {
      toast.success("Booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    onError: () => toast.error("Failed to confirm booking"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertDashboardApi.rejectBooking(id, reason),
    onSuccess: () => {
      toast.success("Booking rejected");
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    onError: () => toast.error("Failed to reject booking"),
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
    return <p className="text-muted-foreground text-sm">Loading your bookings...</p>;
  }

  const pending = bookings.filter((b) => b.status === "pending");
  const others = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">My Bookings</h2>
        <p className="text-muted-foreground text-sm">Manage your appointment requests</p>
      </div>

      {bookings.length === 0 && (
        <p className="text-muted-foreground text-sm">No bookings yet.</p>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Pending Requests</h3>
          {pending.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{booking.fpo_name}</CardTitle>
                <Badge className={STATUS_COLORS[booking.status]}>{booking.status_display}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">
                  <span className="font-medium">{booking.requested_date}</span> at{" "}
                  <span className="font-medium">{booking.requested_time}</span>
                </p>
                {booking.fpo_application_id && <p className="text-muted-foreground text-xs">Application ID: {booking.fpo_application_id}</p>}
                {booking.fpo_contact_name && <p className="text-muted-foreground text-xs">Contact: {booking.fpo_contact_name}</p>}
                {booking.fpo_email && <p className="text-muted-foreground text-xs">Email: {booking.fpo_email}</p>}
                {booking.fpo_phone && <p className="text-muted-foreground text-xs">Phone: {booking.fpo_phone}</p>}
                {booking.topic && <p className="text-muted-foreground text-sm">Topic: {booking.topic}</p>}
                {booking.notes && <p className="text-muted-foreground text-sm">Notes: {booking.notes}</p>}
                {booking.fpo_location && <p className="text-muted-foreground text-xs">Location: {booking.fpo_location}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmMutation.mutate(booking.id)} disabled={confirmMutation.isPending}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(booking)} disabled={rejectMutation.isPending}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Past & Other Bookings</h3>
          {others.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{booking.fpo_name}</CardTitle>
                <Badge className={STATUS_COLORS[booking.status]}>{booking.status_display}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {booking.requested_date} at {booking.requested_time}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectDialog({ open: false, booking: null })}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={submitReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}