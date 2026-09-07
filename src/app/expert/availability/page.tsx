"use client";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { expertDashboardApi } from "@/app/expert/_api/dashboard";
import { expertsApi } from "@/lib/api/experts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface TimeSlot {
  start: string;
  end: string;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
];

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ExpertAvailabilityPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"range" | "single" | "absent">("range");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDates, setSingleDates] = useState<Date[]>([]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_SLOTS);

  const { data: myProfile } = useQuery({
    queryKey: ["my-expert-profile"],
    queryFn: () => expertDashboardApi.getMyProfile(),
  });

  const { data: existingAvailability = [] } = useQuery({
    queryKey: ["my-availability", myProfile?.id],
    queryFn: () => expertsApi.getAvailability(myProfile!.id),
    enabled: !!myProfile,
  });

  const availableDateStrings = new Set(
    existingAvailability.filter((d) => d.time_slots.length > 0).map((d) => d.date)
  );
  const absentDateStrings = new Set(
    existingAvailability.filter((d) => d.time_slots.length === 0).map((d) => d.date)
  );

  const matchingDates = useMemo(() => {
    if (mode === "single" || mode === "absent") {
      return singleDates;
    }
    if (!dateRange?.from || !dateRange.to) return [];
    const dates: Date[] = [];
    const cursor = new Date(dateRange.from);
    while (cursor <= dateRange.to) {
      if (selectedWeekdays.has(cursor.getDay())) {
        dates.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [mode, dateRange, singleDates, selectedWeekdays]);

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  function updateSlot(index: number, field: "start" | "end", value: string) {
    setTimeSlots((prev) => {
      const updated = prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
      const edited = updated[index];
      const isDuplicate = updated.some((s, i) => i !== index && s.start === edited.start && s.end === edited.end);
      if (isDuplicate) {
        toast.error("This time slot duplicates another one. Please use a different time.");
        return prev;
      }
      return updated;
    });
  }

  function addSlot() {
    setTimeSlots((prev) => {
      const newSlot = { start: "09:00", end: "10:00" };
      const isDuplicate = prev.some((s) => s.start === newSlot.start && s.end === newSlot.end);
      if (isDuplicate) {
        toast.error("That time slot already exists. Adjust it before adding another.");
        return prev;
      }
      return [...prev, newSlot];
    });
  }

  function removeSlot(index: number) {
    setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  }

  const skippedInRange = useMemo(() => {
    if (mode !== "range" || !dateRange?.from || !dateRange?.to) return [];
    const dates: Date[] = [];
    const cursor = new Date(dateRange.from);
    while (cursor <= dateRange.to) {
      if (!selectedWeekdays.has(cursor.getDay())) {
        dates.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [mode, dateRange, selectedWeekdays]);

  const mutation = useMutation({
    mutationFn: () =>
      expertDashboardApi.setAvailability(
        myProfile!.id,
        [
          ...matchingDates.map((d) => ({
            date: toLocalISODate(d),
            time_slots: mode === "absent" ? [] : timeSlots,
          })),
          ...skippedInRange.map((d) => ({
            date: toLocalISODate(d),
            time_slots: [],
          })),
        ]
      ),
    onSuccess: () => {
      toast.success(
        mode === "absent"
          ? `Marked ${matchingDates.length} date(s) as absent`
          : `Availability saved for ${matchingDates.length} date(s)`
      );
      setDateRange(undefined);
      setSingleDates([]);
      queryClient.invalidateQueries({ queryKey: ["my-availability", myProfile?.id] });
    },
    onError: () => toast.error("Failed to update availability. Make sure your account is linked to an expert profile."),
  });

  if (!myProfile) {
    return <p className="text-muted-foreground text-sm">Loading your profile...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">Set Availability</h2>
        <p className="text-muted-foreground text-sm">
          Pick a date range, choose which days of the week to include, and set your time slots — all dates in range get saved at once.
          Use "Mark Absent" to explicitly block dates you're unavailable, even if they were previously marked available.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Pick date(s)</CardTitle>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "range" ? "default" : "outline"}
              onClick={() => setMode("range")}
            >
              Date Range
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "single" ? "default" : "outline"}
              onClick={() => setMode("single")}
            >
              Single Date
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "absent" ? "destructive" : "outline"}
              onClick={() => setMode("absent")}
            >
              Mark Absent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "range" ? (
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange(range ?? undefined)}
              disabled={[
                { before: new Date() },
                (date) =>
                  !!dateRange?.from &&
                  !!dateRange?.to &&
                  date >= dateRange.from &&
                  date <= dateRange.to &&
                  !selectedWeekdays.has(date.getDay()),
              ]}
              numberOfMonths={2}
              modifiers={{
                available: (date) => availableDateStrings.has(toLocalISODate(date)),
                absent: (date) => absentDateStrings.has(toLocalISODate(date)),
                weekdaySkipped: (date) =>
                  !!dateRange?.from &&
                  !!dateRange?.to &&
                  date >= dateRange.from &&
                  date <= dateRange.to &&
                  !selectedWeekdays.has(date.getDay()),
              }}
              modifiersClassNames={{
                available: "bg-green-100 text-green-900",
                absent: "bg-red-100 text-red-900 line-through",
                weekdaySkipped: "bg-red-100 text-red-900 line-through",
              }}
              className="rounded-md border w-fit"
            />
          ) : (
            <Calendar
              mode="multiple"
              selected={singleDates}
              onSelect={(dates) => setSingleDates(dates ?? [])}
              disabled={{ before: new Date() }}
              modifiers={{
                available: (date) => availableDateStrings.has(toLocalISODate(date)),
                absent: (date) => absentDateStrings.has(toLocalISODate(date)),
              }}
              modifiersClassNames={{
                available: "bg-green-100 text-green-900",
                absent: "bg-red-100 text-red-900 line-through",
              }}
              className="rounded-md border w-fit"
            />
          )}
        </CardContent>
      </Card>

      {mode === "range" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Which days of the week?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedWeekdays.has(day.value)}
                onCheckedChange={() => toggleWeekday(day.value)}
              />
              {day.label}
            </label>
          ))}
        </CardContent>
      </Card>
      )}

      {mode !== "absent" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Time slots for each date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timeSlots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={slot.start}
                onChange={(e) => updateSlot(index, "start", e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="time"
                value={slot.end}
                onChange={(e) => updateSlot(index, "end", e.target.value)}
                className="w-32"
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeSlot(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addSlot} className="w-fit">
            <Plus className="h-4 w-4 mr-1" />
            Add time slot
          </Button>
        </CardContent>
      </Card>
      )}

      {mode === "range" && matchingDates.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview: dates that will be saved</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="multiple"
            selected={matchingDates}
            disabled={() => true}
            className="rounded-md border w-fit opacity-90"
          />
        </CardContent>
      </Card>
      )}

      {matchingDates.length > 0 && mode !== "absent" && (
        <p className="text-muted-foreground text-sm">
          This will set availability for <span className="font-medium text-foreground">{matchingDates.length}</span> date(s), each with <span className="font-medium text-foreground">{timeSlots.length}</span> time slot(s).
        </p>
      )}

      {matchingDates.length > 0 && mode === "absent" && (
        <p className="text-muted-foreground text-sm">
          This will mark <span className="font-medium text-foreground">{matchingDates.length}</span> date(s) as absent.
        </p>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={matchingDates.length === 0 || (mode !== "absent" && timeSlots.length === 0) || mutation.isPending}
        variant={mode === "absent" ? "destructive" : "default"}
        className="w-fit"
      >
        {mutation.isPending
          ? "Saving..."
          : mode === "absent"
          ? `Mark ${matchingDates.length} date(s) as Absent`
          : `Save Availability for ${matchingDates.length} date(s)`}
      </Button>
    </div>
  );
}
