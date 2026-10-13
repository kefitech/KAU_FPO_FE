"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Landmark,
  type LucideIcon,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";

import { type FPOTrainingSession, fpoTrainingApi } from "@/app/fpo/_api/training";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 9;

type SessionFilter = "" | FPOTrainingSession["status"];
type CardStatus = "today" | FPOTrainingSession["status"];

const STATUS_FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Card accent and status chip. Backend status, except "today" for an upcoming session dated today.
const SESSION_THEME: Record<CardStatus, { accent: string; chip: string; label: string }> = {
  today: { accent: "border-t-amber-500", chip: "border-amber-200 bg-amber-100 text-amber-800", label: "Today" },
  upcoming: {
    accent: "border-t-emerald-500",
    chip: "border-emerald-200 bg-emerald-100 text-emerald-700",
    label: "Upcoming",
  },
  completed: {
    accent: "border-t-slate-300",
    chip: "border-slate-200 bg-slate-100 text-slate-600",
    label: "Completed",
  },
  cancelled: { accent: "border-t-rose-500", chip: "border-rose-200 bg-rose-100 text-rose-700", label: "Cancelled" },
};

// Who scheduled it: the recording official's portal role.
const ROLE_THEME: Record<string, { chip: string; Icon: LucideIcon }> = {
  government: { chip: "border-indigo-200 bg-indigo-50 text-indigo-700", Icon: Landmark },
  cbbo: { chip: "border-teal-200 bg-teal-50 text-teal-700", Icon: HeartHandshake },
  admin: { chip: "border-violet-200 bg-violet-50 text-violet-700", Icon: ShieldCheck },
  other: { chip: "border-border bg-muted text-muted-foreground", Icon: User },
};

/** `YYYY-MM-DD` as a local date; `new Date("YYYY-MM-DD")` would be UTC midnight. */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** One line of the card: icon + value. The label is kept for screen readers and as the icon's tooltip. */
function InfoLine({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span title={label} className="mt-0.5 shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 break-words leading-5">
        <span className="sr-only">{label}: </span>
        {children}
      </span>
    </div>
  );
}

function cardStatus(session: FPOTrainingSession): CardStatus {
  if (session.status !== "upcoming") return session.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(session.date).getTime() === today.getTime() ? "today" : "upcoming";
}

function TrainingCard({ session: s }: { session: FPOTrainingSession }) {
  const theme = SESSION_THEME[cardStatus(s)];
  const role = ROLE_THEME[s.conducted_by_role] ?? ROLE_THEME.other;
  const titleRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Offer "Read more" only when the 2-line clamp actually hides part of the topic,
  // which depends on the card's width — re-measured as the grid resizes.
  useEffect(() => {
    const el = titleRef.current;
    if (!el || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  const participants = `${s.participants_count} participant${s.participants_count === 1 ? "" : "s"}`;

  return (
    <Card className={`flex flex-col gap-4 border-t-4 ${theme.accent}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <CardTitle
              ref={titleRef}
              title={s.topic}
              className={`break-words text-base leading-snug ${expanded ? "" : "line-clamp-2"}`}
            >
              {s.topic}
            </CardTitle>
            {(clamped || expanded) && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-medium text-primary text-xs hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 border text-[11px] ${theme.chip}`}>
            {theme.label}
          </Badge>
        </div>
        {s.status === "cancelled" && s.cancelled_at && (
          <p className="text-rose-700 text-xs">
            Cancelled on{" "}
            {new Date(s.cancelled_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {s.cancellation_reason ? ` · ${s.cancellation_reason}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        <InfoLine icon={CalendarDays} label="Date, time and duration">
          {parseLocalDate(s.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          {s.time ? ` · ${s.time}` : ""} · {s.duration_hours} hours
        </InfoLine>
        <InfoLine icon={MapPin} label="Venue">
          {s.venue || "Venue TBD"}
        </InfoLine>
        <InfoLine icon={User} label="Trainer and participants">
          {s.trainer_name || "Trainer TBD"} · {participants}
        </InfoLine>
        <div className="mt-auto flex flex-col gap-1 border-t pt-3">
          <span className="text-muted-foreground text-xs">Scheduled by</span>
          <div className="flex items-start gap-2">
            <role.Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* Wraps: the badge drops under the name instead of squeezing it */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words font-medium">{s.conducted_by_name}</span>
                <Badge variant="outline" className={`border text-[11px] ${role.chip}`}>
                  {s.conducted_by_role_display}
                </Badge>
              </div>
              {s.conducted_by_detail && <span className="text-muted-foreground text-xs">{s.conducted_by_detail}</span>}
              {s.conducted_by_organisation && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">Organisation: </span>
                  {s.conducted_by_organisation}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FpoTrainingSessionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SessionFilter>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fpo-training-sessions", status, search, page],
    queryFn: () =>
      fpoTrainingApi.getAll({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const sessions = data?.data ?? [];
  const totalCount = data?.meta?.pagination?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleStatusChange(value: SessionFilter) {
    setStatus(value);
    setPage(1);
  }
  const activeFilter = STATUS_FILTERS.find((f) => f.value === status) ?? STATUS_FILTERS[0];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">Training Sessions</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Training sessions scheduled for your FPO</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by topic, trainer or venue..."
          className="w-full sm:w-72"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => handleStatusChange(f.value)}
              className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
                status === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">Loading...</div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn't load training sessions.
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          {status ? `No ${activeFilter.label.toLowerCase()} training sessions.` : "No training sessions scheduled yet."}
        </div>
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <TrainingCard key={s.id} session={s} />
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages} · {totalCount} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
