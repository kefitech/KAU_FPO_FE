"use client";
import {
  type ComponentProps,
  createContext,
  type MouseEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { type ExpertBooking, expertDashboardApi } from "@/app/expert/_api/dashboard";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { expertsApi } from "@/lib/api/experts";
import { translationsApi } from "@/lib/api/translations";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
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

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** How long a date must be pressed to select the range from the last picked date up to it. */
const HOLD_TO_SELECT_RANGE_MS = 2000;
/** Applied to the pressed day button while the hold timer runs. */
const HOLDING_CLASSES = ["animate-pulse", "ring-2", "ring-primary"];
// While a date is held, the dates a completed hold would add are faded in one
// by one, sweeping from the anchor towards the held date. The sweep starts
// after a short delay so an ordinary tap never flashes it, and steps every
// RANGE_PREVIEW_STEP_MS (faster for long spans, so it always lands before the
// hold fires). Classes are marked `!` so they win over the available / absent
// tints on the same button.
const RANGE_PREVIEW_DELAY_MS = 250;
const RANGE_PREVIEW_STEP_MS = 60;
const RANGE_PREVIEW_CLASSES = ["bg-primary/20!", "text-primary!"];

/** Booking statuses that still hold a place in the calendar. */
const LIVE_BOOKING_STATUSES = new Set(["confirmed", "pending"]);

/** Live bookings keyed by requested_date (YYYY-MM-DD). */
function groupLiveBookingsByDate(bookings: ExpertBooking[]) {
  const map = new Map<string, ExpertBooking[]>();
  for (const b of bookings) {
    if (!LIVE_BOOKING_STATUSES.has(b.status)) continue;
    map.set(b.requested_date, [...(map.get(b.requested_date) ?? []), b]);
  }
  return map;
}

// A save message carries a warning when it touched existing bookings: confirmed
// ones cancelled, pending requests declined, or slots kept because they are
// booked. Those are shown in place of the generic success toast.
const BOOKING_WARNING = /cancelled|declined|could not be removed/i;

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekdayOf(dateStr: string) {
  return fromISODate(dateStr).getDay();
}

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m + minutes);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function withItem<T>(set: Set<T>, item: T) {
  const next = new Set(set);
  next.add(item);
  return next;
}

function withoutItem<T>(set: Set<T>, item: T) {
  const next = new Set(set);
  next.delete(item);
  return next;
}

/** Every date from `fromIso` to `toIso` inclusive, in order. */
function datesBetween(fromIso: string, toIso: string) {
  const out: string[] = [];
  const cursor = fromISODate(fromIso);
  const end = fromISODate(toIso);
  while (cursor <= end) {
    out.push(toLocalISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Canonical form of a weekly template, so order-only differences do not count as changes. */
function serializeWeekly(slots: Record<number, TimeSlot[]>) {
  return JSON.stringify(
    ALL_WEEKDAYS.map((d) =>
      [...(slots[d] ?? [])]
        .map((s) => [s.start, s.end, s.max_bookings] as const)
        .sort((a, b) => `${a[0]}${a[1]}`.localeCompare(`${b[0]}${b[1]}`)),
    ),
  );
}

// ─── Press-and-hold on calendar days ─────────────────────────────────────────
// react-day-picker only exposes click handlers, so the day button is swapped
// for one that reports pointer down/up to the page, which runs the hold timer.

const HoldContext = createContext<{
  start: (iso: string, element: HTMLElement) => void;
  end: (reason: "release" | "leave") => void;
} | null>(null);

function HoldableDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  const hold = useContext(HoldContext);
  const { className, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, ...rest } = props;
  const iso = toLocalISODate(props.day.date);
  return (
    <CalendarDayButton
      {...rest}
      // Lets the page find this button by date for the hold range preview.
      data-iso={iso}
      // No text selection or long-press callout while the finger is held down.
      className={cn(className, "touch-manipulation select-none [-webkit-touch-callout:none]")}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (!props.modifiers.disabled) hold?.start(iso, e.currentTarget);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        hold?.end("release");
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        hold?.end("leave");
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        hold?.end("leave");
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// ─── Slot editor (shared by the weekly template and per-date overrides) ──────

function SlotEditor({ slots, onChange, t }: { slots: TimeSlot[]; onChange: (next: TimeSlot[]) => void; t: T }) {
  function update(index: number, patch: Partial<TimeSlot>) {
    const next = slots.map((s, i) => (i === index ? { ...s, ...patch } : s));
    const edited = next[index];
    if (next.some((s, i) => i !== index && s.start === edited.start && s.end === edited.end)) {
      toast.error(t.error_duplicate_slot ?? "This time slot duplicates another one. Please use a different time.");
      return;
    }
    onChange(next);
  }

  function add() {
    const lastEnd = slots.length > 0 ? slots[slots.length - 1].end : "09:00";
    const slot = { start: lastEnd, end: addMinutes(lastEnd, 60), max_bookings: 1 };
    if (slots.some((s) => s.start === slot.start && s.end === slot.end)) {
      toast.error(t.error_duplicate_slot_add ?? "That time slot already exists. Adjust it before adding another.");
      return;
    }
    onChange([...slots, slot]);
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional while being edited
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Input
            type="time"
            value={slot.start}
            onChange={(e) => update(index, { start: e.target.value })}
            className="w-32"
          />
          <span className="text-muted-foreground text-sm">{t.label_to ?? "to"}</span>
          <Input
            type="time"
            value={slot.end}
            onChange={(e) => update(index, { end: e.target.value })}
            className="w-32"
          />
          <span className="text-muted-foreground text-sm">{t.label_max_bookings ?? "max bookings"}</span>
          <Input
            type="number"
            min={1}
            value={slot.max_bookings}
            onChange={(e) => update(index, { max_bookings: Math.max(1, Number(e.target.value) || 1) })}
            className="w-20"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t.btn_remove_slot ?? "Remove time slot"}
            onClick={() => onChange(slots.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add} className="w-fit">
        <Plus className="mr-1 h-4 w-4" />
        {t.btn_add_slot ?? "Add time slot"}
      </Button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  // ── Date selection ───────────────────────────────────────────────────────
  // Dates picked one at a time, plus spans picked by hold / shift-click. The
  // weekday filter applies to the spans live, so unticking a weekday removes
  // those days from the calendar at once; `excluded` holds dates the user
  // tapped off inside a span.
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [ranges, setRanges] = useState<{ from: string; to: string }[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // The last date tapped: a held date selects everything between this and itself.
  const anchorRef = useRef<string | null>(null);
  const [rangeWeekdays, setRangeWeekdays] = useState<Set<number>>(new Set(ALL_WEEKDAYS));
  const holdTimerRef = useRef<number | null>(null);
  // The day button being pressed. Its "holding" look is applied straight to the
  // DOM: a React state change here would re-render the calendar mid-gesture,
  // replace the button under the pointer, and the browser would drop the click.
  const holdElementRef = useRef<HTMLElement | null>(null);
  // True from a hold completing until the gesture's click has been swallowed.
  const holdFiredRef = useRef(false);
  // Buttons showing the faded "will be selected" preview during a hold, and the
  // timer that reveals it. DOM-only for the same reason as holdElementRef.
  const previewElementsRef = useRef<HTMLElement[]>([]);
  const previewTimerRef = useRef<number | null>(null);

  // ── Slots ────────────────────────────────────────────────────────────────
  const [weekdaySlots, setWeekdaySlots] = useState<Record<number, TimeSlot[]>>(
    Object.fromEntries(ALL_WEEKDAYS.map((d) => [d, DEFAULT_SLOTS.map((s) => ({ ...s }))])),
  );
  const [perDateOverrides, setPerDateOverrides] = useState<Record<string, TimeSlot[]>>({});
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [activeWeekdayTab, setActiveWeekdayTab] = useState<number>(1);

  const { data: myProfile } = useQuery({
    queryKey: ["my-expert-profile"],
    queryFn: () => expertDashboardApi.getMyProfile(),
  });
  const expertId = myProfile?.id;

  const { data: existingAvailability = [] } = useQuery({
    queryKey: ["my-availability", expertId],
    queryFn: () => expertsApi.getAvailability(expertId as number),
    enabled: expertId !== undefined,
  });

  const { data: weeklyDefaultsData } = useQuery({
    queryKey: ["my-weekly-defaults", expertId],
    queryFn: () => expertDashboardApi.getWeeklyDefaults(expertId as number),
    enabled: expertId !== undefined,
  });

  // The expert's bookings, to warn before a save or an absence cancels any.
  const { data: myBookings = [] } = useQuery({
    queryKey: ["expert-my-bookings"],
    queryFn: () => expertDashboardApi.getMyBookings(),
    enabled: expertId !== undefined,
  });

  const [weeklyDefaultsLoaded, setWeeklyDefaultsLoaded] = useState(false);
  // What the server currently holds. The save button appears only while the
  // editor differs from it.
  const [savedWeeklySlots, setSavedWeeklySlots] = useState<Record<number, TimeSlot[]>>(
    Object.fromEntries(ALL_WEEKDAYS.map((d) => [d, []])),
  );
  // Set the moment the user touches any weekday slot, so a late fetch never
  // overwrites what they are editing.
  const userEditedWeeklyRef = useRef(false);

  useEffect(() => {
    if (!weeklyDefaultsData || weeklyDefaultsLoaded || userEditedWeeklyRef.current) return;
    if (weeklyDefaultsData.length > 0) {
      const grouped: Record<number, TimeSlot[]> = Object.fromEntries(ALL_WEEKDAYS.map((d) => [d, []]));
      for (const d of weeklyDefaultsData) {
        grouped[d.weekday] = grouped[d.weekday] ?? [];
        grouped[d.weekday].push({ start: d.start, end: d.end, max_bookings: d.max_bookings });
      }
      setWeekdaySlots(grouped);
      setSavedWeeklySlots(grouped);
    }
    setWeeklyDefaultsLoaded(true);
  }, [weeklyDefaultsData, weeklyDefaultsLoaded]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    };
  }, []);

  const availableDateStrings = useMemo(
    () => new Set(existingAvailability.filter((d) => d.time_slots.length > 0).map((d) => d.date)),
    [existingAvailability],
  );
  const absentDateStrings = useMemo(
    () => new Set(existingAvailability.filter((d) => d.time_slots.length === 0).map((d) => d.date)),
    [existingAvailability],
  );

  const todayIso = toLocalISODate(new Date());
  const selected = useMemo(() => {
    const set = new Set(tapped);
    for (const range of ranges) {
      for (const d of datesBetween(range.from, range.to)) {
        if (d >= todayIso && rangeWeekdays.has(weekdayOf(d))) set.add(d);
      }
    }
    for (const d of excluded) set.delete(d);
    return set;
  }, [tapped, ranges, excluded, rangeWeekdays, todayIso]);
  const selectedList = useMemo(() => [...selected].sort(), [selected]);
  const selectedDates = useMemo(() => selectedList.map(fromISODate), [selectedList]);

  function dateLabel(iso: string) {
    return fromISODate(iso).toLocaleDateString(locale === "ml" ? "ml-IN" : "en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function toggleDate(iso: string) {
    if (selected.has(iso)) {
      setTapped((prev) => withoutItem(prev, iso));
      setExcluded((prev) => withItem(prev, iso));
    } else {
      setTapped((prev) => withItem(prev, iso));
      setExcluded((prev) => withoutItem(prev, iso));
    }
    if (expandedDate === iso) setExpandedDate(null);
    anchorRef.current = iso;
  }

  function selectRangeTo(iso: string) {
    const from = anchorRef.current;
    if (!from || from === iso) {
      setTapped((prev) => withItem(prev, iso));
      setExcluded((prev) => withoutItem(prev, iso));
      anchorRef.current = iso;
      toast.info(t.hint_range_anchor ?? "Start date set. Press and hold another date to select every day in between.");
      return;
    }
    const [a, b] = from < iso ? [from, iso] : [iso, from];
    const span = datesBetween(a, b);
    const picked = span.filter((d) => d >= todayIso && rangeWeekdays.has(weekdayOf(d)));
    // The weekday boxes decide what a span selects. A span that would select
    // nothing is a mistake to point out, not a range to keep.
    if (rangeWeekdays.size === 0) {
      toast.error(t.error_range_no_weekdays ?? "Tick at least one weekday below to select a date range.");
      return;
    }
    if (picked.length === 0) {
      toast.error(
        (t.error_range_no_match ?? "No {weekdays} between {from} and {to}. Tick other weekdays or pick a wider range.")
          .replace("{weekdays}", tickedWeekdayLabels())
          .replace("{from}", dateLabel(a))
          .replace("{to}", dateLabel(b)),
      );
      return;
    }
    setRanges((prev) => [...prev, { from: a, to: b }]);
    // The span's ends were tapped individually to set the anchor, which bypasses
    // the weekday boxes. From here on they are part of the range, so the boxes
    // govern them too, on screen and in what gets saved.
    setTapped((prev) => {
      const next = new Set(prev);
      next.delete(a);
      next.delete(b);
      return next;
    });
    // Picking a span again brings back any dates tapped off inside it.
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const d of span) next.delete(d);
      return next;
    });
    anchorRef.current = iso;
    toast.success(
      (t.toast_range_selected ?? "Selected {count} date(s) from {from} to {to}")
        .replace("{count}", String(picked.length))
        .replace("{from}", dateLabel(a))
        .replace("{to}", dateLabel(b)),
    );
  }

  function clearRangePreview() {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    for (const el of previewElementsRef.current) el.classList.remove(...RANGE_PREVIEW_CLASSES);
    previewElementsRef.current = [];
  }

  /**
   * Fade in the dates that completing the hold on `iso` would add (same filter
   * as selectRangeTo), one date per step from the anchor towards the held
   * date, straight on the DOM so nothing re-renders under the held pointer.
   * Already-selected dates and the held date keep their own look.
   */
  function showRangePreview(iso: string, element: HTMLElement) {
    const from = anchorRef.current;
    if (!from || from === iso) return;
    const [a, b] = from < iso ? [from, iso] : [iso, from];
    const wanted = datesBetween(a, b).filter(
      (d) => d !== iso && d >= todayIso && rangeWeekdays.has(weekdayOf(d)) && !selected.has(d),
    );
    if (wanted.length === 0) return;
    const order = from < iso ? wanted : [...wanted].reverse();

    // A date can be on screen twice (as an outside day of the month before it
    // too), so fill every button for a date in the same step.
    const wantedSet = new Set(wanted);
    const root = element.closest('[data-slot="calendar"]') ?? document;
    const byDate = new Map<string, HTMLElement[]>();
    for (const button of root.querySelectorAll<HTMLElement>("button[data-iso]")) {
      const d = button.dataset.iso ?? "";
      if (wantedSet.has(d)) byDate.set(d, [...(byDate.get(d) ?? []), button]);
    }

    const stepMs = Math.min(RANGE_PREVIEW_STEP_MS, (HOLD_TO_SELECT_RANGE_MS - RANGE_PREVIEW_DELAY_MS) / order.length);
    let index = 0;
    const fillNext = () => {
      previewTimerRef.current = null;
      const buttons = byDate.get(order[index]) ?? [];
      for (const button of buttons) button.classList.add(...RANGE_PREVIEW_CLASSES);
      previewElementsRef.current.push(...buttons);
      index += 1;
      if (index < order.length) previewTimerRef.current = window.setTimeout(fillNext, stepMs);
    };
    fillNext();
  }

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdElementRef.current?.classList.remove(...HOLDING_CLASSES);
    holdElementRef.current = null;
    clearRangePreview();
  }

  const hold = {
    start(iso: string, element: HTMLElement) {
      clearHoldTimer();
      holdFiredRef.current = false;
      holdElementRef.current = element;
      element.classList.add(...HOLDING_CLASSES);
      previewTimerRef.current = window.setTimeout(() => {
        previewTimerRef.current = null;
        showRangePreview(iso, element);
      }, RANGE_PREVIEW_DELAY_MS);
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        clearHoldTimer();
        holdFiredRef.current = true;
        selectRangeTo(iso);
      }, HOLD_TO_SELECT_RANGE_MS);
    },
    end(reason: "release" | "leave") {
      clearHoldTimer();
      if (!holdFiredRef.current) return;
      if (reason === "leave") {
        holdFiredRef.current = false;
        return;
      }
      // The click a release produces arrives synchronously after pointerup, so
      // handleDayClick sees the flag. If the calendar re-rendered during the
      // hold there is no click at all, so drop the flag once this turn is over.
      window.setTimeout(() => {
        holdFiredRef.current = false;
      }, 0);
    },
  };

  function handleDayClick(day: Date, _modifiers: unknown, e: MouseEvent) {
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      return;
    }
    const iso = toLocalISODate(day);
    if (e.shiftKey) {
      selectRangeTo(iso);
      return;
    }
    toggleDate(iso);
  }

  function clearSelection() {
    setTapped(new Set());
    setRanges([]);
    setExcluded(new Set());
    setPerDateOverrides({});
    setExpandedDate(null);
    anchorRef.current = null;
  }

  function tickedWeekdayLabels() {
    return WEEKDAYS.filter((d) => rangeWeekdays.has(d.value))
      .map((d) => d.label)
      .join(", ");
  }

  function toggleRangeWeekday(day: number) {
    if (rangeWeekdays.has(day) && rangeWeekdays.size === 1) {
      toast.error(t.error_weekday_keep_one ?? "At least one weekday must stay ticked for date ranges.");
      return;
    }
    setRangeWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  // ── Slots per date ───────────────────────────────────────────────────────
  function getSlotsForDate(dateStr: string): TimeSlot[] {
    return perDateOverrides[dateStr] ?? weekdaySlots[weekdayOf(dateStr)] ?? [];
  }

  function setOverride(dateStr: string, next: TimeSlot[]) {
    setPerDateOverrides((prev) => ({ ...prev, [dateStr]: next }));
  }

  function resetDateToDefault(dateStr: string) {
    setPerDateOverrides((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  }

  // ── Bookings a save would cancel ─────────────────────────────────────────
  // Drives the "N booked" badges on the calendar. NOT used for the pre-save
  // check: that re-fetches, see requestSave().
  const liveBookingsByDate = useMemo(() => groupLiveBookingsByDate(myBookings), [myBookings]);

  /**
   * Live bookings on the selected dates that saving would cancel: all of them
   * when marking absent, otherwise those whose time is not among the slots
   * being saved for that date.
   */
  function bookingsAtRisk(absent: boolean, bookings: ExpertBooking[]) {
    const byDate = groupLiveBookingsByDate(bookings);
    const atRisk: ExpertBooking[] = [];
    for (const date of selectedList) {
      const planned = absent ? [] : getSlotsForDate(date);
      for (const b of byDate.get(date) ?? []) {
        if (!planned.some((slot) => slot.start === b.requested_time.slice(0, 5))) atRisk.push(b);
      }
    }
    return atRisk.sort((a, b) =>
      (a.requested_date + a.requested_time).localeCompare(b.requested_date + b.requested_time),
    );
  }

  // A save waiting for the expert to confirm the cancellations it causes.
  const [pendingSave, setPendingSave] = useState<{ absent: boolean; bookings: ExpertBooking[] } | null>(null);
  // Which action is re-fetching bookings before it can save or ask.
  const [checking, setChecking] = useState<"save" | "absent" | null>(null);

  async function requestSave(absent: boolean) {
    if (selectedList.length === 0) {
      toast.error(t.error_nothing_selected ?? "Select at least one date on the calendar first.");
      return;
    }
    // Always check against the bookings as they are NOW, not the list loaded
    // with the page: a member may have booked one of these dates since, and
    // the cached list (staleTime 1 min) would let that booking be cancelled
    // without the confirmation dialog. staleTime: 0 forces a real request.
    setChecking(absent ? "absent" : "save");
    let bookings: ExpertBooking[];
    try {
      bookings = await queryClient.fetchQuery({
        queryKey: ["expert-my-bookings"],
        queryFn: () => expertDashboardApi.getMyBookings(),
        staleTime: 0,
      });
    } catch (error) {
      // Saving on a list we could not refresh might cancel appointments silently.
      toast.error(
        getErrorMessage(
          error,
          t.toast_bookings_check_failed ?? "Could not check your existing appointments. Please try again.",
        ),
      );
      return;
    } finally {
      setChecking(null);
    }

    const atRisk = bookingsAtRisk(absent, bookings);
    if (atRisk.length === 0) {
      saveMutation.mutate(absent);
      return;
    }
    setPendingSave({ absent, bookings: atRisk });
  }

  // ── Saving ───────────────────────────────────────────────────────────────
  const weeklyScheduleMutation = useMutation({
    mutationFn: () =>
      expertDashboardApi.setWeeklyDefaults(
        expertId as number,
        Object.entries(weekdaySlots).flatMap(([weekday, slots]) =>
          slots.map((s) => ({ weekday: Number(weekday), start: s.start, end: s.end, max_bookings: s.max_bookings })),
        ),
      ),
    onSuccess: (result) => {
      if (BOOKING_WARNING.test(result.message)) {
        toast.warning(result.message, { duration: 10_000 });
      } else {
        toast.success(t.toast_weekly_saved ?? "Weekly schedule saved.");
      }
      setSavedWeeklySlots(weekdaySlots);
      queryClient.invalidateQueries({ queryKey: ["my-weekly-defaults", expertId] });
      // The weekly template is cascaded onto upcoming dates, so their slots changed too.
      queryClient.invalidateQueries({ queryKey: ["my-availability", expertId] });
    },
    onError: (error) => toast.error(getErrorMessage(error, t.toast_weekly_failed ?? "Failed to save weekly schedule.")),
  });

  const saveMutation = useMutation({
    mutationFn: (absent: boolean) =>
      expertDashboardApi.setAvailability(
        expertId as number,
        selectedList.map((date) => ({ date, time_slots: absent ? [] : getSlotsForDate(date) })),
      ),
    onSuccess: (result, absent) => {
      const count = String(selectedList.length);
      if (result.message && BOOKING_WARNING.test(result.message)) {
        toast.warning(result.message, { duration: 10_000 });
      } else if (absent) {
        toast.success((t.toast_marked_absent ?? "Marked {count} date(s) as absent").replace("{count}", count));
      } else {
        toast.success((t.toast_saved ?? "Availability saved for {count} date(s)").replace("{count}", count));
      }
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["my-availability", expertId] });
      // Removed slots cancel their bookings, so the list used for warnings is stale.
      queryClient.invalidateQueries({ queryKey: ["expert-my-bookings"] });
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          t.toast_failed ?? "Failed to update availability. Make sure your account is linked to an expert profile.",
        ),
      ),
  });

  if (!myProfile) {
    return <p className="text-muted-foreground text-sm">{t.loading ?? "Loading your profile..."}</p>;
  }

  const count = String(selectedList.length);
  const activeWeekdayLabel = WEEKDAYS.find((d) => d.value === activeWeekdayTab)?.label;
  const weeklyDirty = serializeWeekly(weekdaySlots) !== serializeWeekly(savedWeeklySlots);
  const hasSavedWeekly = ALL_WEEKDAYS.some((d) => (savedWeeklySlots[d] ?? []).length > 0);
  function discardWeeklyChanges() {
    setWeekdaySlots(
      Object.fromEntries(ALL_WEEKDAYS.map((d) => [d, (savedWeeklySlots[d] ?? []).map((s) => ({ ...s }))])),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-2xl">{t.page_title ?? "Set Availability"}</h2>
        <p className="text-muted-foreground text-sm">
          {t.page_description ??
            "Pick the dates you want to change on the calendar, then save them with your time slots or mark them absent."}
        </p>
      </div>

      {/* ── 1. Calendar ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.step1_title ?? "1. Pick date(s)"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t.calendar_hint ??
              "Tap a date to select or unselect it. Press and hold a date for 2 seconds (or Shift+click) to select every day from your last tap up to it."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <HoldContext.Provider value={hold}>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={() => undefined}
              onDayClick={handleDayClick}
              numberOfMonths={2}
              disabled={{ before: new Date() }}
              modifiers={{
                available: (date) => {
                  const iso = toLocalISODate(date);
                  return availableDateStrings.has(iso) && !selected.has(iso);
                },
                absent: (date) => {
                  const iso = toLocalISODate(date);
                  return absentDateStrings.has(iso) && !selected.has(iso);
                },
                editing: (date) => expandedDate === toLocalISODate(date),
              }}
              modifiersClassNames={{
                available: "bg-green-100 text-green-900",
                absent: "bg-red-100 text-red-900 line-through",
                editing: "ring-2 ring-primary",
              }}
              components={{ DayButton: HoldableDayButton }}
              className="w-fit rounded-md border"
            />
          </HoldContext.Provider>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
              {t.legend_selected ?? "Selected"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-100 ring-1 ring-green-300" />
              {t.legend_available ?? "Has time slots"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
              {t.legend_absent ?? "Marked absent"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">
              {t.range_weekdays_label ?? "Weekdays included in selected ranges:"}
            </span>
            {WEEKDAYS.map((day) => (
              <span key={day.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={`range-weekday-${day.value}`}
                  checked={rangeWeekdays.has(day.value)}
                  onCheckedChange={() => toggleRangeWeekday(day.value)}
                />
                <label htmlFor={`range-weekday-${day.value}`}>{day.label}</label>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">{(t.summary_selected ?? "{count} date(s) selected").replace("{count}", count)}</p>
            {selectedList.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                {t.btn_clear_selection ?? "Clear selection"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Weekly template ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.weekly_title ?? "2. Your weekly time slots"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t.weekly_desc ??
              "Click a weekday to edit its time slots. This is your standing weekly schedule and is what selected dates get unless you customise them below."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <Button
                key={day.value}
                type="button"
                size="sm"
                variant={activeWeekdayTab === day.value ? "default" : "outline"}
                onClick={() => setActiveWeekdayTab(day.value)}
              >
                {day.label}
                <span className="ml-1 text-xs opacity-70">{(weekdaySlots[day.value] ?? []).length}</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="font-medium text-sm">{activeWeekdayLabel}</p>
            <SlotEditor
              slots={weekdaySlots[activeWeekdayTab] ?? []}
              onChange={(next) => {
                userEditedWeeklyRef.current = true;
                setWeekdaySlots((prev) => ({ ...prev, [activeWeekdayTab]: next }));
              }}
              t={t}
            />
          </div>
          {weeklyDirty && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-amber-800 text-sm dark:text-amber-300">
                {hasSavedWeekly
                  ? (t.weekly_unsaved ?? "You have unsaved changes to your weekly schedule.")
                  : (t.weekly_not_saved_yet ?? "Your weekly schedule has not been saved yet.")}
              </p>
              <div className="flex gap-2">
                {hasSavedWeekly && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={discardWeeklyChanges}
                    disabled={weeklyScheduleMutation.isPending}
                  >
                    {t.btn_discard_weekly ?? "Discard"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => weeklyScheduleMutation.mutate()}
                  disabled={weeklyScheduleMutation.isPending}
                >
                  {weeklyScheduleMutation.isPending
                    ? (t.btn_saving ?? "Saving...")
                    : (t.btn_save_weekly ?? "Save Weekly Schedule")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Selected dates ───────────────────────────────────────────── */}
      {selectedList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {(t.selected_title ?? "3. Selected dates ({count})").replace("{count}", count)}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t.selected_desc ??
                "Each date gets your weekly slots for that weekday. Click a date to give it different slots, or remove it from the selection."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {selectedList.map((iso) => {
                const isEditing = expandedDate === iso;
                const isCustom = iso in perDateOverrides;
                const bookedCount = liveBookingsByDate.get(iso)?.length ?? 0;
                return (
                  <span
                    key={iso}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-xs",
                      isEditing ? "border-primary bg-primary/10" : "bg-background",
                    )}
                  >
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => setExpandedDate(isEditing ? null : iso)}
                    >
                      {dateLabel(iso)}
                      {isCustom ? ` · ${t.badge_custom ?? "custom"}` : ""}
                      {absentDateStrings.has(iso) ? ` · ${t.badge_currently_absent ?? "absent now"}` : ""}
                      {bookedCount > 0
                        ? ` · ${(t.badge_booked ?? "{count} booked").replace("{count}", String(bookedCount))}`
                        : ""}
                    </button>
                    <button
                      type="button"
                      aria-label={t.btn_remove_date ?? "Remove date"}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => toggleDate(iso)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            {expandedDate && selected.has(expandedDate) && (
              <div className="flex flex-col gap-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">
                    {(t.editing_date_title ?? "Editing {date}").replace("{date}", dateLabel(expandedDate))}
                  </p>
                  <div className="flex gap-2">
                    {expandedDate in perDateOverrides && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => resetDateToDefault(expandedDate)}>
                        {t.btn_reset_default ?? "Reset to weekly default"}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedDate(null)}>
                      {t.btn_close ?? "Close"}
                    </Button>
                  </div>
                </div>
                <SlotEditor
                  slots={getSlotsForDate(expandedDate)}
                  onChange={(next) => setOverride(expandedDate, next)}
                  t={t}
                />
                <p className="text-muted-foreground text-xs">
                  {t.hint_no_slots_absent ?? "A date saved with no time slots is marked absent."}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => requestSave(false)}
                disabled={saveMutation.isPending || checking !== null}
              >
                {saveMutation.isPending
                  ? (t.btn_saving ?? "Saving...")
                  : checking === "save"
                    ? (t.btn_checking_bookings ?? "Checking appointments...")
                    : (t.btn_save_availability ?? "Save Availability for {count} date(s)").replace("{count}", count)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => requestSave(true)}
                disabled={saveMutation.isPending || checking !== null}
              >
                {checking === "absent"
                  ? (t.btn_checking_bookings ?? "Checking appointments...")
                  : (t.btn_mark_absent_count ?? "Mark {count} date(s) as Absent").replace("{count}", count)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={pendingSave !== null} onOpenChange={(open) => !open && setPendingSave(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {(t.dialog_bookings_title ?? "{count} appointment(s) will be cancelled").replace(
                "{count}",
                String(pendingSave?.bookings.length ?? 0),
              )}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {pendingSave?.absent
              ? (t.dialog_bookings_absent ??
                "Members have booked these appointments on the dates you are marking absent. Going ahead cancels them and notifies the members.")
              : (t.dialog_bookings_save ??
                "The time slots you are saving no longer include these appointments. Going ahead cancels them and notifies the members.")}
          </p>
          <ul className="max-h-48 min-w-0 divide-y overflow-y-auto rounded-md border text-sm sm:max-h-64">
            {pendingSave?.bookings.map((b) => {
              // FPO, member and topic can each be long free text; one truncated
              // line here, the full record on the booking page.
              const details = [b.fpo_name, b.user_name, b.topic].filter(Boolean).join(" · ");
              return (
                <li key={b.id}>
                  <Link
                    href={`/expert/booking/fpo/${b.fpo}#booking-${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t.dialog_booking_open ?? "Open this appointment in a new tab"}
                    className="flex min-w-0 flex-col px-3 py-2 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {dateLabel(b.requested_date)} · {b.requested_time.slice(0, 5)}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="truncate text-muted-foreground text-xs" title={details}>
                      {details}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-9 whitespace-normal"
              onClick={() => setPendingSave(null)}
            >
              {t.btn_keep_dates ?? "Keep these dates"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-auto min-h-9 whitespace-normal"
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!pendingSave) return;
                const { absent } = pendingSave;
                setPendingSave(null);
                saveMutation.mutate(absent);
              }}
            >
              {(pendingSave?.absent
                ? (t.btn_absent_and_cancel ?? "Mark absent and cancel {count} appointment(s)")
                : (t.btn_save_and_cancel ?? "Save and cancel {count} appointment(s)")
              ).replace("{count}", String(pendingSave?.bookings.length ?? 0))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
