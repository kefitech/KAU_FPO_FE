"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { expertsApi } from "@/lib/api/experts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ExpertBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: number;
  expertName: string;
}

export function ExpertBookingDialog({ open, onOpenChange, expertId, expertName }: ExpertBookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const { data: days = [], isLoading } = useQuery({
    queryKey: ["expert-availability", expertId],
    queryFn: () => expertsApi.getAvailability(expertId),
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const mutation = useMutation({
    mutationFn: () =>
      expertsApi.bookSlot(expertId, {
        requested_date: selectedDate as string,
        requested_time: selectedTime as string,
        time_slot_id: selectedSlotId ?? undefined,
        topic,
        notes,
      }),
    onSuccess: () => {
      toast.success("Booking request submitted. The expert will confirm shortly.");
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedSlotId(null);
      setTopic("");
      setNotes("");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const status = (error as { status?: number })?.status;
      if (status === 403) {
        toast.error("Your FPO must be approved to book experts.");
        return;
      }

      const msg = (error as { message?: string })?.message;
      const data = (error as { data?: Record<string, unknown> })?.data;

      // 1) Prefer a real backend message (StandardResponse envelope: {status, message, data})
      //    Axios's own generic fallback text ("Request failed with status code ...") or the
      //    client.ts default ("An error occurred") should NOT be shown as-is — fall through instead.
      const isGenericMsg =
        !msg ||
        msg === "An error occurred" ||
        msg.toLowerCase().includes("request failed");

      if (!isGenericMsg) {
        toast.error(msg as string);
        return;
      }

      // 2) Fall back to DRF field-level validation errors, e.g. {topic: ["Please enter a topic..."]}
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data).find((k) => k !== "status" && k !== "message" && k !== "data");
        const firstError = firstKey ? data[firstKey] : undefined;
        const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
        if (errorText) {
          toast.error(errorText as string);
          return;
        }
      }

      // 3) Last resort
      toast.error(msg ?? "Failed to submit booking. Please try again.");
    },
  });

  function handleSubmit() {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time.");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic for this appointment.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book an appointment with {expertName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isLoading && <p className="text-muted-foreground text-sm">Loading available slots...</p>}

          {!isLoading && days.length === 0 && (
            <p className="text-muted-foreground text-sm">No available slots right now. Please check back later.</p>
          )}

          {!isLoading && days.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm">Select a date</p>
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  const iso = toLocalISODate(date);
                  setSelectedDate(iso);
                  setSelectedTime(null);
                  setSelectedSlotId(null);
                }}
                disabled={(date) => {
                  const iso = toLocalISODate(date);
                  const day = days.find((d) => d.date === iso);
                  return !day || day.time_slots.length === 0;
                }}
                className="rounded-md border w-fit"
              />

              {selectedDate && (
                <>
                  <p className="font-medium text-sm">Select a time</p>
                  <div className="flex flex-wrap gap-2">
                    {days
                      .find((d) => d.date === selectedDate)
                      ?.time_slots.map((slot) => (
                        <Button
                          key={slot.id}
                          type="button"
                          size="sm"
                          variant={selectedSlotId === slot.id ? "default" : "outline"}
                          disabled={slot.is_booked}
                          onClick={() => {
                            setSelectedTime(slot.start);
                            setSelectedSlotId(slot.id);
                          }}
                        >
                          {slot.start} - {slot.end}
                          {slot.is_booked ? " (booked)" : ""}
                        </Button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="booking-topic">
              Topic <span className="text-red-500">*</span>
            </label>
            <Input
              id="booking-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Crop disease consultation"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="booking-notes">Notes (optional)</label>
            <Textarea id="booking-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details the expert should know" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Request Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}