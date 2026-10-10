"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type ExpertAvailabilityDay, expertsApi } from "@/lib/api/experts";
import type { AdminExpert } from "@/types/admin";

type T = Record<string, string>;
type Tab = "details" | "bookings" | "availability";

interface ExpertDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expert: AdminExpert | null;
  t: T;
  tCommon: T;
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  scientist: "border-indigo-200 bg-indigo-100 text-indigo-700",
  trainer: "border-green-200 bg-green-100 text-green-700",
  banker: "border-blue-200 bg-blue-100 text-blue-700",
  facilitator: "border-teal-200 bg-teal-100 text-teal-700",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-100 text-amber-800",
  confirmed: "border-green-200 bg-green-100 text-green-800",
  completed: "border-blue-200 bg-blue-100 text-blue-800",
  cancelled: "border-red-200 bg-red-100 text-red-700",
  rejected: "border-red-200 bg-red-100 text-red-700",
};

type DayState = "open" | "partial" | "full" | "absent";

/** How a day reads on the calendar: every slot free, some taken, all taken, or no slots at all. */
function dayState(day: ExpertAvailabilityDay): DayState {
  if (day.time_slots.length === 0) return "absent";
  const booked = day.time_slots.filter((slot) => slot.is_booked).length;
  if (booked === 0) return "open";
  return booked === day.time_slots.length ? "full" : "partial";
}

const DAY_STATE_CLASSES: Record<DayState, string> = {
  open: "bg-green-100 text-green-900",
  partial: "bg-amber-100 text-amber-900",
  full: "bg-red-100 text-red-900",
  absent: "bg-gray-200 text-gray-500 line-through",
};

const DAY_STATE_SWATCH: Record<DayState, string> = {
  open: "bg-green-300",
  partial: "bg-amber-300",
  full: "bg-red-300",
  absent: "bg-gray-400",
};

function fromISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
        <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function DetailsTab({ expert, t }: { expert: AdminExpert; t: T }) {
  const districtLabel = t[`district_${expert.district}`] ?? expert.district;
  const badgeClass = CATEGORY_BADGE_COLORS[expert.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-lg">
          {expert.name_en.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{expert.name_en}</p>
          {expert.name_ml && <p className="text-muted-foreground text-sm">{expert.name_ml}</p>}
          <Badge className={`mt-1 w-fit border font-medium text-xs ${badgeClass}`} variant="outline">
            {t[`cat_${expert.category}`] ?? expert.category_display}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoRow label={t.field_designation ?? "Designation"} value={expert.designation} />
        <InfoRow label={t.field_organisation ?? "Organisation"} value={expert.organisation} />
        <InfoRow label={t.field_primary_expertise ?? "Primary Expertise"} value={expert.primary_expertise} />
        <InfoRow label={t.field_secondary_expertise ?? "Secondary Expertise"} value={expert.secondary_expertise} />
        {districtLabel && <InfoRow label={t.field_district ?? "District"} value={districtLabel} />}
      </div>

      <div className="flex flex-col gap-2">
        {expert.email && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a href={`mailto:${expert.email}`} className="hover:text-foreground">
              {expert.email}
            </a>
          </div>
        )}
        {expert.phone && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {expert.phone}
          </div>
        )}
        {districtLabel && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {districtLabel}, Kerala
          </div>
        )}
      </div>
    </div>
  );
}

/** Upcoming confirmed appointments, a status breakdown, and a link to the full list. */
function BookingsTab({ expertId, t }: { expertId: number; t: T }) {
  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-expert-bookings", expertId],
    queryFn: () => adminExpertsApi.getBookings(expertId),
    staleTime: 60 * 1000,
  });

  if (isLoading) return <ListSkeleton />;
  if (isError) {
    return <p className="text-destructive text-sm">{t.error_bookings ?? "Could not load bookings."}</p>;
  }

  const today = toLocalISODate(new Date());
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.requested_date >= today)
    .sort((a, b) => `${a.requested_date} ${a.requested_time}`.localeCompare(`${b.requested_date} ${b.requested_time}`));
  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([code, n]) => (
          <Badge key={code} variant="outline" className={`border text-xs ${STATUS_BADGE_COLORS[code] ?? ""}`}>
            {t[`status_${code}`] ?? code}: {n}
          </Badge>
        ))}
        {bookings.length === 0 && (
          <p className="text-muted-foreground text-sm">{t.empty_bookings ?? "No bookings yet."}</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-xs">
            {(t.upcoming_title ?? "Upcoming ({count})").replace("{count}", String(upcoming.length))}
          </p>
          {upcoming.slice(0, 8).map((b) => (
            <div key={b.id} className="flex flex-col gap-0.5 rounded-lg border p-3">
              <span className="font-medium text-sm">
                {dateLabel(b.requested_date)} · {b.requested_time}
              </span>
              <span className="text-muted-foreground text-xs">
                {b.fpo_name}
                {b.user_name ? ` · ${b.user_name}` : ""}
                {b.topic ? ` · ${b.topic}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {bookings.length > 0 && (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={`/admin/experts/${expertId}/bookings`}>
            {(t.btn_all_bookings ?? "View all bookings ({count})").replace("{count}", String(bookings.length))}
          </Link>
        </Button>
      )}
    </div>
  );
}

/** The expert's upcoming availability as a colour-coded calendar, with the clicked day's slots underneath. */
function AvailabilityTab({ expertId, t }: { expertId: number; t: T }) {
  const {
    data: days = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expert-availability", expertId],
    queryFn: () => expertsApi.getAvailability(expertId),
    staleTime: 60 * 1000,
  });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const counts = useMemo(() => {
    const acc: Record<DayState, number> = { open: 0, partial: 0, full: 0, absent: 0 };
    for (const day of days) acc[dayState(day)] += 1;
    return acc;
  }, [days]);

  if (isLoading) return <ListSkeleton />;
  if (isError) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        {t.error_availability ?? "Availability is only shown for active experts."}
      </p>
    );
  }
  if (days.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        {t.empty_availability ?? "No upcoming availability set."}
      </p>
    );
  }

  const stateOf = (date: Date) => {
    const iso = toLocalISODate(date);
    const day = byDate.get(iso);
    // The selected day keeps the calendar's own highlight instead of its colour.
    return day && iso !== selectedIso ? dayState(day) : null;
  };
  const selectedDay = selectedIso ? byDate.get(selectedIso) : undefined;
  const legend: { state: DayState; label: string }[] = [
    { state: "open", label: t.legend_open ?? "Open" },
    { state: "partial", label: t.legend_partial ?? "Partly booked" },
    { state: "full", label: t.legend_full ?? "Fully booked" },
    { state: "absent", label: t.legend_absent ?? "Absent" },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        mode="single"
        selected={selectedIso ? fromISODate(selectedIso) : undefined}
        onSelect={(date) => setSelectedIso(date ? toLocalISODate(date) : null)}
        defaultMonth={fromISODate(days[0].date)}
        disabled={(date) => !byDate.has(toLocalISODate(date))}
        modifiers={{
          open: (date) => stateOf(date) === "open",
          partial: (date) => stateOf(date) === "partial",
          full: (date) => stateOf(date) === "full",
          absent: (date) => stateOf(date) === "absent",
        }}
        modifiersClassNames={DAY_STATE_CLASSES}
        className="w-fit rounded-md border"
      />

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {legend.map(({ state, label }) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm ${DAY_STATE_SWATCH[state]}`} />
            {label} · {counts[state]}
          </span>
        ))}
      </div>

      {selectedDay ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-1.5 rounded-lg border p-3 text-center">
          <span className="font-medium text-sm">{dateLabel(selectedDay.date)}</span>
          {selectedDay.time_slots.length === 0 ? (
            <span className="text-muted-foreground text-xs">{t.label_absent ?? "Marked absent"}</span>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {selectedDay.time_slots.map((slot) => (
                <Badge
                  key={slot.id}
                  variant="outline"
                  className={`border text-xs ${slot.is_booked ? "border-red-200 bg-red-100 text-red-800" : "border-green-200 bg-green-100 text-green-800"}`}
                >
                  {slot.start}–{slot.end} · {slot.confirmed_count ?? 0}/{slot.max_bookings ?? 1}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t.hint_pick_day ?? "Click a coloured day to see its slots."}</p>
      )}
    </div>
  );
}

export function ExpertDetailDialog({ open, onOpenChange, expert, t }: ExpertDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  if (!expert) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: t.tab_details ?? "Details" },
    { id: "bookings", label: t.tab_bookings ?? "Bookings" },
    { id: "availability", label: t.tab_availability ?? "Availability" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.view_title ?? "Expert Details"}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-0 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-2 max-h-[50vh] overflow-y-auto">
          {activeTab === "details" && <DetailsTab expert={expert} t={t} />}
          {activeTab === "bookings" && <BookingsTab expertId={expert.id} t={t} />}
          {activeTab === "availability" && <AvailabilityTab expertId={expert.id} t={t} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
