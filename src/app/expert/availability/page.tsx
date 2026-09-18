"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

interface TimeSlot {
  start: string;
  end: string;
  max_bookings: number;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: "09:00", end: "10:00", max_bookings: 1 },
  { start: "10:00", end: "11:00", max_bookings: 1 },
  { start: "11:00", end: "12:00", max_bookings: 1 },
  { start: "14:00", end: "15:00", max_bookings: 1 },
  { start: "15:00", end: "16:00", max_bookings: 1 },
];

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekdayFromDateStr(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export default function ExpertAvailabilityPage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_availability,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.expert_availability ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const WEEKDAYS = [
    { value: 0, label: t.weekday_sun ?? "Sun" },
    { value: 1, label: t.weekday_mon ?? "Mon" },
    { value: 2, label: t.weekday_tue ?? "Tue" },
    { value: 3, label: t.weekday_wed ?? "Wed" },
    { value: 4, label: t.weekday_thu ?? "Thu" },
    { value: 5, label: t.weekday_fri ?? "Fri" },
    { value: 6, label: t.weekday_sat ?? "Sat" },
  ];

  const [mode, setMode] = useState<"range" | "absent">("range");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDates, setSingleDates] = useState<Date[]>([]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  );
  const [excludedDateStrings, setExcludedDateStrings] = useState<Set<string>>(new Set());
  const [weekdaySlots, setWeekdaySlots] = useState<Record<number, TimeSlot[]>>({
    0: DEFAULT_SLOTS.map((s) => ({ ...s })),
    1: DEFAULT_SLOTS.map((s) => ({ ...s })),
    2: DEFAULT_SLOTS.map((s) => ({ ...s })),
    3: DEFAULT_SLOTS.map((s) => ({ ...s })),
    4: DEFAULT_SLOTS.map((s) => ({ ...s })),
    5: DEFAULT_SLOTS.map((s) => ({ ...s })),
    6: DEFAULT_SLOTS.map((s) => ({ ...s })),
  });
  const [perDateOverrides, setPerDateOverrides] = useState<Record<string, TimeSlot[]>>({});
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [activeWeekdayTab, setActiveWeekdayTab] = useState<number>(1);

  const { data: myProfile } = useQuery({
    queryKey: ["my-expert-profile"],
    queryFn: () => expertDashboardApi.getMyProfile(),
  });

  const { data: existingAvailability = [] } = useQuery({
    queryKey: ["my-availability", myProfile?.id],
    queryFn: () => expertsApi.getAvailability(myProfile!.id),
    enabled: !!myProfile,
  });

  const { data: weeklyDefaultsData } = useQuery({
    queryKey: ["my-weekly-defaults", myProfile?.id],
    queryFn: () => expertDashboardApi.getWeeklyDefaults(myProfile!.id),
    enabled: !!myProfile,
  });

  const [weeklyDefaultsLoaded, setWeeklyDefaultsLoaded] = useState(false);
  // Set to true the moment the user touches any weekday slot. Once true, the
  // background fetch below is never allowed to overwrite weekdaySlots, even
  // if it resolves after the user has already started editing.
  const userEditedWeeklyRef = useRef(false);

  useEffect(() => {
    if (!weeklyDefaultsData || weeklyDefaultsLoaded || userEditedWeeklyRef.current) return;
    if (weeklyDefaultsData.length > 0) {
      const grouped: Record<number, TimeSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      for (const d of weeklyDefaultsData) {
        grouped[d.weekday] = grouped[d.weekday] ?? [];
        grouped[d.weekday].push({ start: d.start, end: d.end, max_bookings: d.max_bookings });
      }
      setWeekdaySlots(grouped);
    }
    setWeeklyDefaultsLoaded(true);
  }, [weeklyDefaultsData, weeklyDefaultsLoaded]);

  const weeklyScheduleMutation = useMutation({
    mutationFn: () =>
      expertDashboardApi.setWeeklyDefaults(
        myProfile!.id,
        Object.entries(weekdaySlots).flatMap(([weekday, slots]) =>
          slots.map((s) => ({ weekday: Number(weekday), start: s.start, end: s.end, max_bookings: s.max_bookings }))
        )
      ),
    onSuccess: () => {
      toast.success(t.toast_weekly_saved ?? "Weekly schedule saved.");
      queryClient.invalidateQueries({ queryKey: ["my-weekly-defaults", myProfile?.id] });
    },
    onError: () => toast.error(t.toast_weekly_failed ?? "Failed to save weekly schedule."),
  });

  const availableDateStrings = useMemo(
    () => new Set(existingAvailability.filter((d) => d.time_slots.length > 0).map((d) => d.date)),
    [existingAvailability]
  );
  const absentDateStrings = useMemo(
    () => new Set(existingAvailability.filter((d) => d.time_slots.length === 0).map((d) => d.date)),
    [existingAvailability]
  );

  const candidateDates = useMemo(() => {
    if (mode === "absent") {
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

  // O(1) lookup set mirroring candidateDates, so calendar cell renders don't
  // scan the whole array for every day shown.
  const candidateDateStrings = useMemo(
    () => new Set(candidateDates.map((d) => toLocalISODate(d))),
    [candidateDates]
  );

  const matchingDates = useMemo(() => {
    if (mode !== "range") return candidateDates;
    return candidateDates.filter((d) => !excludedDateStrings.has(toLocalISODate(d)));
  }, [mode, candidateDates, excludedDateStrings]);

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      // If the day we just deselected was the active tab, fall back to
      // another still-selected day so the tab bar doesn't hold onto a
      // stale "primary" selection for a day that's no longer checked.
      if (day === activeWeekdayTab && !next.has(day)) {
        const fallback = WEEKDAYS.find((d) => next.has(d.value))?.value;
        setActiveWeekdayTab(fallback ?? -1);
      }
      return next;
    });
  }

  function updateSlot(weekday: number, index: number, field: "start" | "end", value: string) {
    userEditedWeeklyRef.current = true;
    setWeekdaySlots((prev) => {
      const current = prev[weekday] ?? [];
      const updated = current.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
      const edited = updated[index];
      const isDuplicate = updated.some((s, i) => i !== index && s.start === edited.start && s.end === edited.end);
      if (isDuplicate) {
        toast.error(t.error_duplicate_slot ?? "This time slot duplicates another one. Please use a different time.");
        return prev;
      }
      return { ...prev, [weekday]: updated };
    });
  }

  function updateSlotCapacity(weekday: number, index: number, value: number) {
    userEditedWeeklyRef.current = true;
    setWeekdaySlots((prev) => {
      const current = prev[weekday] ?? [];
      return { ...prev, [weekday]: current.map((slot, i) => (i === index ? { ...slot, max_bookings: Math.max(1, value) } : slot)) };
    });
  }

  function addSlot(weekday: number) {
    userEditedWeeklyRef.current = true;
    setWeekdaySlots((prev) => {
      const current = prev[weekday] ?? [];
      const lastEnd = current.length > 0 ? current[current.length - 1].end : "09:00";
      const [h, m] = lastEnd.split(":").map(Number);
      const nextStart = lastEnd;
      const nextEndDate = new Date(2000, 0, 1, h, m + 60);
      const nextEnd = `${String(nextEndDate.getHours()).padStart(2, "0")}:${String(nextEndDate.getMinutes()).padStart(2, "0")}`;
      const newSlot = { start: nextStart, end: nextEnd, max_bookings: 1 };

      const isDuplicate = current.some((s) => s.start === newSlot.start && s.end === newSlot.end);
      if (isDuplicate) {
        toast.error(t.error_duplicate_slot_add ?? "That time slot already exists. Adjust it before adding another.");
        return prev;
      }
      return { ...prev, [weekday]: [...current, newSlot] };
    });
  }

  function removeSlot(weekday: number, index: number) {
    userEditedWeeklyRef.current = true;
    setWeekdaySlots((prev) => ({ ...prev, [weekday]: (prev[weekday] ?? []).filter((_, i) => i !== index) }));
  }

  function getSlotsForDate(dateStr: string): TimeSlot[] {
    return perDateOverrides[dateStr] ?? weekdaySlots[getWeekdayFromDateStr(dateStr)] ?? [];
  }

  function defaultForDate(dateStr: string): TimeSlot[] {
    return (weekdaySlots[getWeekdayFromDateStr(dateStr)] ?? []).map((s) => ({ ...s }));
  }

  function updateOverrideSlot(dateStr: string, index: number, field: "start" | "end", value: string) {
    setPerDateOverrides((prev) => {
      const current = prev[dateStr] ?? defaultForDate(dateStr);
      const updated = current.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
      return { ...prev, [dateStr]: updated };
    });
  }

  function updateOverrideCapacity(dateStr: string, index: number, value: number) {
    setPerDateOverrides((prev) => {
      const current = prev[dateStr] ?? defaultForDate(dateStr);
      const updated = current.map((slot, i) => (i === index ? { ...slot, max_bookings: Math.max(1, value) } : slot));
      return { ...prev, [dateStr]: updated };
    });
  }

  function addOverrideSlot(dateStr: string) {
    setPerDateOverrides((prev) => {
      const current = prev[dateStr] ?? defaultForDate(dateStr);
      const lastEnd = current.length > 0 ? current[current.length - 1].end : "09:00";
      const [h, m] = lastEnd.split(":").map(Number);
      const nextEndDate = new Date(2000, 0, 1, h, m + 60);
      const nextEnd = `${String(nextEndDate.getHours()).padStart(2, "0")}:${String(nextEndDate.getMinutes()).padStart(2, "0")}`;
      return { ...prev, [dateStr]: [...current, { start: lastEnd, end: nextEnd, max_bookings: 1 }] };
    });
  }

  function removeOverrideSlot(dateStr: string, index: number) {
    setPerDateOverrides((prev) => {
      const current = prev[dateStr] ?? defaultForDate(dateStr);
      return { ...prev, [dateStr]: current.filter((_, i) => i !== index) };
    });
  }

  function resetDateToDefault(dateStr: string) {
    setPerDateOverrides((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  }

  function toggleDateExclusion(dateStr: string) {
    setExcludedDateStrings((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
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

  const excludedInRange = useMemo(() => {
    if (mode !== "range") return [];
    return candidateDates.filter((d) => excludedDateStrings.has(toLocalISODate(d)));
  }, [mode, candidateDates, excludedDateStrings]);

  const mutation = useMutation({
    mutationFn: () =>
      expertDashboardApi.setAvailability(
        myProfile!.id,
        [
          ...matchingDates.map((d) => ({
            date: toLocalISODate(d),
            time_slots: mode === "absent" ? [] : getSlotsForDate(toLocalISODate(d)),
          })),
          ...skippedInRange.map((d) => ({
            date: toLocalISODate(d),
            time_slots: [],
          })),
          ...excludedInRange.map((d) => ({
            date: toLocalISODate(d),
            time_slots: [],
          })),
        ]
      ),
    onSuccess: (result: any) => {
      const backendNote = result?.message;
      toast.success(
        backendNote && backendNote.includes("confirmed bookings")
          ? backendNote
          : mode === "absent"
          ? (t.toast_marked_absent ?? "Marked {count} date(s) as absent").replace("{count}", String(matchingDates.length))
          : (t.toast_saved ?? "Availability saved for {count} date(s)").replace("{count}", String(matchingDates.length))
      );
      setDateRange(undefined);
      setSingleDates([]);
      setExcludedDateStrings(new Set());
      setPerDateOverrides({});
      setExpandedDate(null);
      queryClient.invalidateQueries({ queryKey: ["my-availability", myProfile?.id] });
    },
    onError: () => toast.error(t.toast_failed ?? "Failed to update availability. Make sure your account is linked to an expert profile."),
  });

  if (!myProfile) {
    return <p className="text-muted-foreground text-sm">{t.loading ?? "Loading your profile..."}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">{t.page_title ?? "Set Availability"}</h2>
        <p className="text-muted-foreground text-sm">
          {t.page_description_1 ?? "Pick a date range, choose which days of the week to include, and set your time slots - all dates in range get saved at once."}
          {" "}
          {t.page_description_2 ?? "Use \"Mark Absent\" to explicitly block dates you are unavailable, even if they were previously marked available."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.step1_title ?? "1. Pick date(s)"}</CardTitle>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "range" ? "default" : "outline"}
              onClick={() => setMode("range")}
            >
              {t.btn_date_range ?? "Date Range"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "absent" ? "destructive" : "outline"}
              onClick={() => setMode("absent")}
            >
              {t.btn_mark_absent ?? "Mark Absent"}
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
          <CardTitle className="text-base">{t.step2_title ?? "2. Which days of the week?"}</CardTitle>
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
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{t.step3_title ?? "3. Time slots for each day of the week"}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {t.step3_desc ?? "Click a weekday to edit its time slots. This is your standing weekly schedule, independent of any date range."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => weeklyScheduleMutation.mutate()}
              disabled={weeklyScheduleMutation.isPending || !myProfile}
              className="shrink-0"
            >
              {weeklyScheduleMutation.isPending
                ? (t.btn_saving ?? "Saving...")
                : (t.btn_save_weekly ?? "Save Weekly Schedule")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.filter((day) => selectedWeekdays.has(day.value)).map((day) => (
              <Button
                key={day.value}
                type="button"
                size="sm"
                variant={activeWeekdayTab === day.value ? "default" : "outline"}
                onClick={() => setActiveWeekdayTab(day.value)}
              >
                {day.label}
              </Button>
            ))}
          </div>

          {selectedWeekdays.has(activeWeekdayTab) ? (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="font-medium text-sm">
                {WEEKDAYS.find((d) => d.value === activeWeekdayTab)?.label}
              </p>
              {(weekdaySlots[activeWeekdayTab] ?? []).map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateSlot(activeWeekdayTab, index, "start", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">{t.label_to ?? "to"}</span>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateSlot(activeWeekdayTab, index, "end", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">{t.label_max_bookings ?? "max bookings"}</span>
                  <Input
                    type="number"
                    min={1}
                    value={slot.max_bookings}
                    onChange={(e) => updateSlotCapacity(activeWeekdayTab, index, Number(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeSlot(activeWeekdayTab, index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => addSlot(activeWeekdayTab)} className="w-fit">
                <Plus className="h-4 w-4 mr-1" />
                {t.btn_add_slot ?? "Add time slot"}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t.select_weekday_hint ?? "Select a checked weekday above to edit its time slots."}
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {mode === "range" && candidateDates.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.dates_list_title ?? "Adjust individual dates"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t.dates_list_desc ?? "Click a date below to edit its time slots or mark it unavailable."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Calendar
            mode="multiple"
            selected={matchingDates}
            onSelect={() => {}}
            onDayClick={(day) => setExpandedDate(toLocalISODate(day))}
            disabled={(date) => !candidateDateStrings.has(toLocalISODate(date))}
            modifiers={{
              excluded: (date) => {
                const key = toLocalISODate(date);
                return candidateDateStrings.has(key) && excludedDateStrings.has(key);
              },
              editing: (date) => expandedDate === toLocalISODate(date),
            }}
            modifiersClassNames={{
              excluded: "bg-red-100 text-red-900 line-through opacity-70",
              editing: "ring-2 ring-primary",
            }}
            className="rounded-md border w-fit"
          />

          {expandedDate && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {(t.editing_date_title ?? "Editing {date}").replace("{date}", new Date(expandedDate).toLocaleDateString())}
                </p>
                <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedDate(null)}>
                  {t.btn_close ?? "Close"}
                </Button>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={excludedDateStrings.has(expandedDate)}
                  onCheckedChange={() => toggleDateExclusion(expandedDate)}
                />
                {t.label_mark_unavailable ?? "Mark this date unavailable"}
              </label>

              {!excludedDateStrings.has(expandedDate) && (
                <div className="flex flex-col gap-2">
                  {getSlotsForDate(expandedDate).map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input type="time" value={slot.start} onChange={(e) => updateOverrideSlot(expandedDate, index, "start", e.target.value)} className="w-28" />
                      <span className="text-muted-foreground text-xs">{t.label_to ?? "to"}</span>
                      <Input type="time" value={slot.end} onChange={(e) => updateOverrideSlot(expandedDate, index, "end", e.target.value)} className="w-28" />
                      <Input type="number" min={1} value={slot.max_bookings} onChange={(e) => updateOverrideCapacity(expandedDate, index, Number(e.target.value) || 1)} className="w-16" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeOverrideSlot(expandedDate, index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => addOverrideSlot(expandedDate)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.btn_add_slot ?? "Add time slot"}
                    </Button>
                    {perDateOverrides[expandedDate] && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => resetDateToDefault(expandedDate)}>
                        {t.btn_reset_default ?? "Reset to default"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {matchingDates.length > 0 && mode !== "absent" && (
        <p className="text-muted-foreground text-sm">
          {(t.summary_availability ?? "This will set availability for {count} date(s).")
            .replace("{count}", String(matchingDates.length))}
        </p>
      )}

      {matchingDates.length > 0 && mode === "absent" && (
        <p className="text-muted-foreground text-sm">
          {(t.summary_absent ?? "This will mark {count} date(s) as absent.").replace("{count}", String(matchingDates.length))}
        </p>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={candidateDates.length === 0 || (mode !== "absent" && Object.values(weekdaySlots).every((slots) => slots.length === 0)) || mutation.isPending}
        variant={mode === "absent" ? "destructive" : "default"}
        className="w-fit"
      >
        {mutation.isPending
          ? (t.btn_saving ?? "Saving...")
          : mode === "absent"
          ? (t.btn_mark_absent_count ?? "Mark {count} date(s) as Absent").replace("{count}", String(matchingDates.length))
          : (t.btn_save_availability ?? "Save Availability for {count} date(s)").replace("{count}", String(matchingDates.length))}
      </Button>
    </div>
  );
}