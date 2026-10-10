"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Hash,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

import { type ExpertBooking, expertDashboardApi } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { compareBookings, compareFpoGroups } from "./_lib/order";

type T = Record<string, string>;

const PAGE_SIZE = 10;

// Same tints as the dashboard's status badges, so both pages read alike.
const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  confirmed: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

// Filter choices. Pending and rejected are legacy statuses that new bookings never get,
// so they are not offered here; old rows with them still render with their badge.
const STATUSES = ["confirmed", "completed", "cancelled"] as const;

/** Rows per FPO card before "view more" is needed. */
const PER_FPO_PREVIEW = 3;

/** One labelled line of a booking row; long values wrap to two lines and show in full on hover. */
function BookingField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="line-clamp-2 text-muted-foreground text-xs [overflow-wrap:anywhere]" title={value}>
      <span className="font-medium text-foreground/80">{label}:</span> {value}
    </p>
  );
}

function ContactItem({ icon: Icon, value }: { icon: typeof Mail; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {value}
    </span>
  );
}

export default function ExpertBookingOverviewPage() {
  const router = useRouter();
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

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  // FPO cards whose full booking list is shown instead of the first few.
  const [expandedFpos, setExpandedFpos] = useState<Set<number>>(new Set());

  // The page belongs to the filter set it was chosen under, so changing any
  // filter drops back to page 1.
  const filterKey = `${filterStatus}|${filterDateFrom}|${filterDateTo}|${filterSearch}`;
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ filterKey, page: next });

  const hasFilters = filterStatus !== "all" || !!filterDateFrom || !!filterDateTo || !!filterSearch;
  function clearFilters() {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSearch("");
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t.loading ?? "Loading your bookings..."}</div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterDateFrom && b.requested_date < filterDateFrom) return false;
    if (filterDateTo && b.requested_date > filterDateTo) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const haystack = `${b.fpo_name ?? ""} ${b.fpo_district ?? ""} ${b.user_name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const groupedByFpo = filteredBookings.reduce<Record<number, ExpertBooking[]>>((acc, b) => {
    if (!acc[b.fpo]) acc[b.fpo] = [];
    acc[b.fpo].push(b);
    return acc;
  }, {});

  for (const group of Object.values(groupedByFpo)) {
    group.sort(compareBookings);
  }

  // FPOs with the nearest upcoming appointment first; the detail page uses the same order.
  const fpoGroups = Object.values(groupedByFpo).sort(compareFpoGroups);

  const totalPages = Math.max(1, Math.ceil(fpoGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedFpoGroups = fpoGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-bold text-3xl">{t.page_title ?? "My Bookings"}</h1>
        <p className="text-muted-foreground">
          {t.page_description ?? "Every appointment booked with you, grouped by FPO"}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <label className="text-muted-foreground text-xs" htmlFor="filter-search">
              {t.filter_search ?? "FPO, district or member"}
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-search"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder={t.filter_search_placeholder ?? "Search..."}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs" htmlFor="filter-status">
              {t.filter_status ?? "Status"}
            </label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filter_status_all ?? "All"}</SelectItem>
                {STATUSES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {getStatusLabel(code, code.charAt(0).toUpperCase() + code.slice(1))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs" htmlFor="filter-from">
              {t.filter_from ?? "From"}
            </label>
            <Input
              id="filter-from"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs" htmlFor="filter-to">
              {t.filter_to ?? "To"}
            </label>
            <Input
              id="filter-to"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          {hasFilters && (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t.filter_clear ?? "Clear filters"}
            </Button>
          )}
        </CardContent>
      </Card>

      {bookings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No bookings yet."}</p>
          </CardContent>
        </Card>
      )}

      {fpoGroups.length === 0 && bookings.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-muted-foreground text-sm">{t.empty_no_matches ?? "No bookings match your filters."}</p>
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              {t.filter_clear ?? "Clear filters"}
            </Button>
          </CardContent>
        </Card>
      )}

      {pagedFpoGroups.map((group) => {
        const first = group[0];
        const open = () => router.push(`/expert/booking/fpo/${first.fpo}`);
        return (
          <Card
            key={first.fpo}
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-colors hover:bg-muted/40"
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{first.fpo_name}</CardTitle>
                  <CardDescription>
                    {(t.booking_count ?? "{count} booking(s)").replace("{count}", String(group.length))}
                    {first.fpo_district ? ` · ${first.fpo_district}` : ""}
                  </CardDescription>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <ContactItem icon={Hash} value={first.fpo_application_id} />
                <ContactItem icon={User} value={first.fpo_contact_name} />
                <ContactItem icon={Mail} value={first.fpo_email} />
                <ContactItem icon={Phone} value={first.fpo_phone} />
                <ContactItem icon={MapPin} value={first.fpo_location} />
                <ContactItem icon={Users} value={first.fpo_total_members} />
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-2">
              {(expandedFpos.has(first.fpo) ? group : group.slice(0, PER_FPO_PREVIEW)).map((b) => {
                const badgeStyle = STATUS_BADGE_STYLES[b.status ?? ""] ?? "border-muted text-muted-foreground";
                return (
                  <div key={b.id} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="flex items-center gap-1.5 font-medium text-sm">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {b.requested_date} · {b.requested_time}
                      </p>
                      <BookingField label={t.field_booked_by ?? "Booked by"} value={b.user_name} />
                      <BookingField label={t.field_topic ?? "Topic"} value={b.topic} />
                      <BookingField label={t.field_message ?? "Message"} value={b.notes} />
                      {(b.status === "cancelled" || b.status === "rejected") && (
                        <BookingField label={t.field_reason ?? "Reason"} value={b.cancellation_reason} />
                      )}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[11px] ${badgeStyle}`}>
                      {getStatusLabel(b.status, b.status_display)}
                    </Badge>
                  </div>
                );
              })}
              {group.length > PER_FPO_PREVIEW && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={(e) => {
                    // The card itself navigates on click; this button must not.
                    e.stopPropagation();
                    setExpandedFpos((prev) => {
                      const next = new Set(prev);
                      if (next.has(first.fpo)) {
                        next.delete(first.fpo);
                      } else {
                        next.add(first.fpo);
                      }
                      return next;
                    });
                  }}
                >
                  {expandedFpos.has(first.fpo)
                    ? (t.btn_show_less ?? "Show less")
                    : (t.btn_view_more ?? "View {count} more").replace(
                        "{count}",
                        String(group.length - PER_FPO_PREVIEW),
                      )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {(t.pagination_summary ?? "Page {page} of {total_pages} · {count} FPOs")
              .replace("{page}", String(currentPage))
              .replace("{total_pages}", String(totalPages))
              .replace("{count}", String(fpoGroups.length))}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t.btn_previous ?? "Previous"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              {t.btn_next ?? "Next"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
