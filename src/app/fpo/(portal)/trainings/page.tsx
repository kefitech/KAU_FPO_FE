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
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

const PAGE_SIZE = 9;

type T = Record<string, string>;
type SessionFilter = "" | FPOTrainingSession["status"];
type CardStatus = "today" | FPOTrainingSession["status"];

// `labelKey` / `emptyKey` are fpo_trainings.* translation keys; `label` / `empty` are the English fallbacks.
const STATUS_FILTERS: { value: SessionFilter; labelKey: string; label: string; emptyKey: string; empty: string }[] = [
  {
    value: "",
    labelKey: "filter_all",
    label: "All",
    emptyKey: "empty_all",
    empty: "No training sessions scheduled yet.",
  },
  {
    value: "upcoming",
    labelKey: "filter_upcoming",
    label: "Upcoming",
    emptyKey: "empty_upcoming",
    empty: "No upcoming training sessions.",
  },
  {
    value: "completed",
    labelKey: "filter_completed",
    label: "Completed",
    emptyKey: "empty_completed",
    empty: "No completed training sessions.",
  },
  {
    value: "cancelled",
    labelKey: "filter_cancelled",
    label: "Cancelled",
    emptyKey: "empty_cancelled",
    empty: "No cancelled training sessions.",
  },
];

// Card accent and status chip. Backend status, except "today" for an upcoming session dated today.
const SESSION_THEME: Record<CardStatus, { accent: string; chip: string; labelKey: string; label: string }> = {
  today: {
    accent: "border-t-amber-500",
    chip: "border-amber-200 bg-amber-100 text-amber-800",
    labelKey: "status_today",
    label: "Today",
  },
  upcoming: {
    accent: "border-t-emerald-500",
    chip: "border-emerald-200 bg-emerald-100 text-emerald-700",
    labelKey: "status_upcoming",
    label: "Upcoming",
  },
  completed: {
    accent: "border-t-slate-300",
    chip: "border-slate-200 bg-slate-100 text-slate-600",
    labelKey: "status_completed",
    label: "Completed",
  },
  cancelled: {
    accent: "border-t-rose-500",
    chip: "border-rose-200 bg-rose-100 text-rose-700",
    labelKey: "status_cancelled",
    label: "Cancelled",
  },
};

// Who scheduled it: the recording official's portal role. The badge text is translated here
// from the role code; the backend's English conducted_by_role_display is only the fallback.
const ROLE_THEME: Record<string, { chip: string; Icon: LucideIcon; labelKey: string }> = {
  government: { chip: "border-indigo-200 bg-indigo-50 text-indigo-700", Icon: Landmark, labelKey: "role_government" },
  cbbo: { chip: "border-teal-200 bg-teal-50 text-teal-700", Icon: HeartHandshake, labelKey: "role_cbbo" },
  admin: { chip: "border-violet-200 bg-violet-50 text-violet-700", Icon: ShieldCheck, labelKey: "role_admin" },
  other: { chip: "border-border bg-muted text-muted-foreground", Icon: User, labelKey: "role_other" },
};

/** `YYYY-MM-DD` as a local date; `new Date("YYYY-MM-DD")` would be UTC midnight. */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Fills `{name}` placeholders in a translated string. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
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

function TrainingCard({ session: s, locale, t }: { session: FPOTrainingSession; locale: string; t: T }) {
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

  const participants = fill(
    s.participants_count === 1
      ? (t.participants_one ?? "{count} participant")
      : (t.participants_many ?? "{count} participants"),
    { count: s.participants_count },
  );

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
                className="whitespace-nowrap font-medium text-primary text-xs hover:underline"
              >
                {expanded ? (t.show_less ?? "Show less") : (t.read_more ?? "Read more")}
              </button>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 border text-[11px] ${theme.chip}`}>
            {t[theme.labelKey] ?? theme.label}
          </Badge>
        </div>
        {s.status === "cancelled" && s.cancelled_at && (
          <p className="text-rose-700 text-xs">
            {fill(t.cancelled_on ?? "Cancelled on {date}", { date: formatDate(new Date(s.cancelled_at), locale) })}
            {s.cancellation_reason ? ` · ${s.cancellation_reason}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        <InfoLine icon={CalendarDays} label={t.label_date_time ?? "Date, time and duration"}>
          {formatDate(parseLocalDate(s.date), locale)}
          {s.time ? ` · ${s.time}` : ""} · {fill(t.duration_hours ?? "{hours} hours", { hours: s.duration_hours })}
        </InfoLine>
        <InfoLine icon={MapPin} label={t.label_venue ?? "Venue"}>
          {s.venue || (t.venue_tbd ?? "Venue TBD")}
        </InfoLine>
        <InfoLine icon={User} label={t.label_trainer_participants ?? "Trainer and participants"}>
          {s.trainer_name || (t.trainer_tbd ?? "Trainer TBD")} · {participants}
        </InfoLine>
        <div className="mt-auto flex flex-col gap-1 border-t pt-3">
          <span className="text-muted-foreground text-xs">{t.scheduled_by ?? "Scheduled by"}</span>
          <div className="flex items-start gap-2">
            <role.Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* Wraps: the badge drops under the name instead of squeezing it */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words font-medium">{s.conducted_by_name}</span>
                <Badge variant="outline" className={`border text-[11px] ${role.chip}`}>
                  {t[role.labelKey] ?? s.conducted_by_role_display}
                </Badge>
              </div>
              {s.conducted_by_detail && <span className="text-muted-foreground text-xs">{s.conducted_by_detail}</span>}
              {s.conducted_by_organisation && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">{t.label_organisation ?? "Organisation"}: </span>
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
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SessionFilter>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_trainings,common")
      .then((data) => setT(data.fpo_trainings ?? {}))
      .catch(() => undefined);
  }, [locale]);

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
        <h1 className="font-bold text-2xl">{t.page_title ?? "Training Sessions"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Training sessions scheduled for your FPO"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t.search_placeholder ?? "Search by topic, trainer or venue..."}
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
              {t[f.labelKey] ?? f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          {t.loading ?? "Loading..."}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_load ?? "Couldn't load training sessions."}
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          {t[activeFilter.emptyKey] ?? activeFilter.empty}
        </div>
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <TrainingCard key={s.id} session={s} locale={locale} t={t} />
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-muted-foreground text-sm">
              {fill(t.pagination_summary ?? "Page {page} of {total_pages} · {count} total", {
                page,
                total_pages: totalPages,
                count: totalCount,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t.btn_previous ?? "Previous"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t.btn_next ?? "Next"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
