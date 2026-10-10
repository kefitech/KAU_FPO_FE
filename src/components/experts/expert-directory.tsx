"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CalendarClock, ChevronLeft, ChevronRight, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";

import { fpoDashboardApi } from "@/app/fpo/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpertBookingDialog } from "@/components/ui/expert-booking-dialog";
import { ExpertEnquiryDialog } from "@/components/ui/expert-enquiry-dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFpoPermissions } from "@/hooks/use-fpo-permissions";
import { type ExpertBooking, expertsApi } from "@/lib/api/experts";
import { translationsApi } from "@/lib/api/translations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useLocaleStore } from "@/stores/locale-store";
import { DISTRICT_OPTIONS, type FpoExpert } from "@/types/fpo";

type T = Record<string, string>;

const PAGE_SIZE = 12;
// Keep in step with CANCEL_REASON_MAX_CHARS in the backend booking views.
const CANCEL_REASON_MAX_CHARS = 300;

const EXPERT_CATEGORIES = [
  { value: "", label: "All Experts" },
  { value: "scientist", label: "Scientist / Researcher" },
  { value: "trainer", label: "Trainer / Extension Worker" },
  { value: "banker", label: "Banker / Financial Advisor" },
  { value: "facilitator", label: "Facilitator / NGO" },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  scientist: "bg-indigo-100 text-indigo-700 border-indigo-200",
  trainer: "bg-green-100 text-green-700 border-green-200",
  banker: "bg-blue-100 text-blue-700 border-blue-200",
  facilitator: "bg-teal-100 text-teal-700 border-teal-200",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

// Order of status groups in the "View Bookings" dialog. Live appointments
// first (soonest upcoming at the top), then history, most recent first.
const BOOKING_STATUS_ORDER: Record<ExpertBooking["status"], number> = {
  confirmed: 0,
  pending: 1,
  cancelled: 2,
  completed: 3,
  rejected: 4,
};

function sortBookingsForDisplay(bookings: ExpertBooking[]): ExpertBooking[] {
  const when = (b: ExpertBooking) => `${b.requested_date} ${b.requested_time}`;
  return [...bookings].sort((a, b) => {
    const byStatus = (BOOKING_STATUS_ORDER[a.status] ?? 99) - (BOOKING_STATUS_ORDER[b.status] ?? 99);
    if (byStatus !== 0) return byStatus;
    const live = a.status === "confirmed" || a.status === "pending";
    return live ? when(a).localeCompare(when(b)) : when(b).localeCompare(when(a));
  });
}

const DISTRICT_SELECT_OPTIONS = [
  { value: "", label: "All Districts" },
  ...DISTRICT_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
];

function ExpertSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-28 mt-2" />
    </div>
  );
}

function ExpertCard({
  expert,
  readOnly,
  isApprovedFpo,
  bookings,
  onContact,
  onBook,
  onViewBookings,
  t,
  locale,
}: {
  expert: FpoExpert;
  /** CBBO / government directory — no contact, booking or bookings actions */
  readOnly: boolean;
  isApprovedFpo: boolean;
  bookings: ExpertBooking[];
  onContact: (expert: FpoExpert) => void;
  /** Omitted when the user lacks can_book_experts — the Book button is hidden. */
  onBook?: (expert: FpoExpert) => void;
  onViewBookings: (expert: FpoExpert) => void;
  t: T;
  locale: string;
}) {
  const badgeClass = CATEGORY_BADGE_COLORS[expert.category] ?? "bg-muted text-muted-foreground";
  const hasBookings = bookings.length > 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Badge className={`w-fit text-xs font-medium border ${badgeClass}`} variant="outline">
            {t[`filter_${expert.category}`] ?? expert.category_display}
          </Badge>
          {hasBookings && (
            <Badge variant="outline" className="w-fit text-xs font-medium border bg-muted text-foreground">
              {bookings.length} booking{bookings.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="font-semibold text-base leading-snug">
            {locale === "ml" ? expert.name_ml || expert.name_en : expert.name_en}
          </h3>
          {expert.designation && <p className="text-xs text-muted-foreground">{expert.designation}</p>}
          {expert.organisation && <p className="text-xs text-muted-foreground">{expert.organisation}</p>}
        </div>
      </div>

      {expert.district && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {t[`district_${expert.district}`] ??
            DISTRICT_OPTIONS.find((d) => d.value === expert.district)?.label ??
            expert.district}
        </div>
      )}

      {expert.primary_expertise && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.label_expertise ?? "Expertise"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{expert.primary_expertise}</p>
        </div>
      )}
      {!readOnly && (
        <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
          {isApprovedFpo ? (
            <>
              <Button
                size="sm"
                variant="default"
                className={onBook ? undefined : "col-span-2"}
                onClick={() => onContact(expert)}
              >
                {t.btn_contact ?? "Contact Expert"}
              </Button>
              {onBook && (
                <Button size="sm" variant="outline" className="h-8.5 px-2 text-xs" onClick={() => onBook(expert)}>
                  Book Appointment
                </Button>
              )}
              {hasBookings && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="col-span-2 text-xs gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={() => onViewBookings(expert)}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  View Bookings
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              title={t.btn_contact_locked_title ?? "Available to approved FPOs only"}
              className="opacity-60 cursor-not-allowed"
            >
              {t.btn_contact_locked ?? "Contact Expert"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ExpertBookingsListDialog({
  open,
  onOpenChange,
  expertName,
  bookings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertName?: string;
  bookings: ExpertBooking[];
}) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState<ExpertBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const sortedBookings = useMemo(() => sortBookingsForDisplay(bookings), [bookings]);

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertsApi.cancelBooking(id, reason),
    onSuccess: () => {
      toast.success("Booking cancelled.");
      setCancelling(null);
      setCancelReason("");
      // The slot is open again for everyone, and this FPO's list has changed.
      queryClient.invalidateQueries({ queryKey: ["fpo-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["expert-availability"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to cancel booking.")),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bookings with {expertName}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {sortedBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bookings found.</p>
            ) : (
              sortedBookings.map((b) => {
                const statusClass = STATUS_BADGE_COLORS[b.status] ?? "bg-muted text-muted-foreground";
                return (
                  <div key={b.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{b.requested_date}</span>
                      <Badge variant="outline" className={`border text-xs ${statusClass}`}>
                        {b.status_display ?? b.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{b.requested_time}</p>
                    {b.topic && <p className="text-foreground text-xs">{b.topic}</p>}
                    {b.notes && <p className="text-muted-foreground text-xs">{b.notes}</p>}
                    {b.status === "cancelled" && b.cancellation_reason && (
                      <p className="text-muted-foreground text-xs italic">Reason: {b.cancellation_reason}</p>
                    )}
                    {b.status === "rejected" &&
                      ((b as ExpertBooking & { rejection_reason?: string | null }).rejection_reason ||
                        b.cancellation_reason) && (
                        <p className="text-muted-foreground text-xs italic">
                          Reason:{" "}
                          {(b as ExpertBooking & { rejection_reason?: string | null }).rejection_reason ||
                            b.cancellation_reason}
                        </p>
                      )}
                    {b.can_cancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 w-fit text-destructive hover:text-destructive"
                        onClick={() => {
                          setCancelReason("");
                          setCancelling(b);
                        }}
                      >
                        Cancel booking
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling !== null} onOpenChange={(isOpen) => !isOpen && setCancelling(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
          </DialogHeader>
          {cancelling && (
            <p className="text-muted-foreground text-sm">
              {cancelling.requested_date} · {cancelling.requested_time} with {expertName}. The slot is released for
              others to book.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional) — the expert will see this"
              rows={3}
              maxLength={CANCEL_REASON_MAX_CHARS}
              className="resize-none"
            />
            <p className="text-right text-muted-foreground text-xs">
              {cancelReason.length}/{CANCEL_REASON_MAX_CHARS}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelling(null)}>
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelling && cancelMutation.mutate({ id: cancelling.id, reason: cancelReason.trim() })}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel booking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Expert directory (category tabs, district filter, search, pagination).
 * FPO portal: contact / book / view-bookings actions. `readOnly` (CBBO and
 * government portals): browse only, and none of the FPO-only data is fetched.
 */
export function ExpertDirectory({ readOnly = false }: { readOnly?: boolean }) {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [activeCategory, setActiveCategory] = useState("");
  const [district, setDistrict] = useState("");
  // Server-side sort: experts I have booked come first, soonest upcoming appointment first.
  const [bookedFirst, setBookedFirst] = useState(false);
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "fpo_experts,districts,common")
      .then((data) => setT({ ...(data.districts ?? {}), ...(data.fpo_experts ?? {}) }))
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);
  const districtSelectOptions = useMemo(
    () =>
      DISTRICT_OPTIONS.map((d) => ({
        value: d.value,
        label: t[`district_${d.value}`] ?? d.label,
      })),
    [t],
  );

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const fpoPermissions = useFpoPermissions();
  const canBook = !readOnly && fpoPermissions.can("can_book_experts");
  const [enquiryDialog, setEnquiryDialog] = useState<{ open: boolean; expert: FpoExpert | null }>({
    open: false,
    expert: null,
  });
  const [bookingDialog, setBookingDialog] = useState<{ open: boolean; expert: FpoExpert | null }>({
    open: false,
    expert: null,
  });
  const [bookingsListDialog, setBookingsListDialog] = useState<{ open: boolean; expert: FpoExpert | null }>({
    open: false,
    expert: null,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["fpo-dashboard"],
    queryFn: fpoDashboardApi.get,
    staleTime: 5 * 60 * 1000,
    enabled: !readOnly,
  });

  const isApprovedFpo = dashboard?.profile?.status === "approved";

  // The page belongs to the filter set it was chosen under, so any filter
  // change falls back to page 1 without an extra request for a stale page.
  const filterKey = `${activeCategory}|${district}|${search}|${bookedFirst}`;
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ filterKey, page: next });

  const { data: expertsPage, isLoading } = useQuery({
    queryKey: ["fpo-experts", activeCategory, district, search, bookedFirst, page],
    queryFn: () =>
      expertsApi.list({
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(district ? { district } : {}),
        ...(search ? { search } : {}),
        ...(bookedFirst ? { sort: "booked" as const } : {}),
        page,
        page_size: PAGE_SIZE,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const experts = expertsPage?.data;
  const totalCount = expertsPage?.meta?.pagination?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Only the current user's own bookings (the FPO owner also gets legacy rows
  // with no booker), so cards and the dialog never show other members' bookings.
  const { data: bookings } = useQuery({
    queryKey: ["fpo-bookings"],
    queryFn: () => expertsApi.listMyBookings(),
    enabled: !!isApprovedFpo,
    staleTime: 60 * 1000,
  });

  const bookingsByExpertId = useMemo(() => {
    const map = new Map<number, ExpertBooking[]>();
    (bookings ?? []).forEach((b: ExpertBooking) => {
      const list = map.get(b.expert) ?? [];
      list.push(b);
      map.set(b.expert, list);
    });
    return map;
  }, [bookings]);

  // Debounce searchInput -> search, so the query re-fires automatically as
  // the user types (after a short pause) instead of needing a submit button.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  function handleContact(expert: FpoExpert) {
    if (!isApprovedFpo) {
      toast.error(t.enquiry_not_approved ?? "Your FPO must be approved to contact experts.");
      return;
    }
    setEnquiryDialog({ open: true, expert });
  }
  function handleBook(expert: FpoExpert) {
    if (!isApprovedFpo) {
      toast.error("Your FPO must be approved to book experts.");
      return;
    }
    setBookingDialog({ open: true, expert });
  }
  function handleViewBookings(expert: FpoExpert) {
    setBookingsListDialog({ open: true, expert });
  }

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div>
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="mt-1.5 h-4 w-80 rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
              <div key={i} className="h-6 w-20 rounded-full bg-muted" />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="h-8 w-full rounded bg-muted sm:w-48" />
            <div className="h-8 flex-1 rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <ExpertSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Expert Directory"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {readOnly
            ? (t.page_description_readonly ?? "Browse agricultural experts and KAU specialists")
            : (t.page_description ?? "Connect with agricultural experts and KAU specialists")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {EXPERT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.value === "" ? (t.filter_all ?? cat.label) : (t[`filter_${cat.value}`] ?? cat.label)}
            </button>
          ))}
        </div>

        {/* District + Search row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-48">
            <SearchableSelect
              value={district}
              onChange={setDistrict}
              options={districtSelectOptions}
              placeholder={t.district_placeholder ?? "All Districts"}
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 pr-8 h-8 text-sm"
              placeholder={t.search_placeholder ?? "Search experts…"}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {!readOnly && isApprovedFpo && (
            <Button
              type="button"
              size="sm"
              variant={bookedFirst ? "default" : "outline"}
              className="h-8 gap-1.5 text-xs sm:shrink-0"
              aria-pressed={bookedFirst}
              onClick={() => setBookedFirst((v) => !v)}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              {t.btn_booked_first ?? "Booked experts first"}
            </Button>
          )}
        </div>
      </div>

      {/* Expert Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <ExpertSkeleton key={i} />
          ))}
        </div>
      ) : !experts || experts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-muted-foreground text-sm">
            {activeCategory || district || search
              ? (t.empty_filtered ?? "No experts match your search. Try adjusting your filters.")
              : (t.empty_state ?? "No experts found.")}
          </p>
          {(activeCategory || district || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveCategory("");
                setDistrict("");
                setSearch("");
                setSearchInput("");
              }}
            >
              {t.btn_clear_filters ?? "Clear filters"}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                readOnly={readOnly}
                isApprovedFpo={!!isApprovedFpo}
                bookings={bookingsByExpertId.get(expert.id) ?? []}
                onContact={handleContact}
                onBook={canBook ? handleBook : undefined}
                onViewBookings={handleViewBookings}
                t={t}
                locale={locale}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {(t.pagination_summary ?? "Page {page} of {total_pages} · {count} experts")
                  .replace("{page}", String(page))
                  .replace("{total_pages}", String(totalPages))
                  .replace("{count}", String(totalCount))}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t.btn_previous ?? "Previous"}
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {t.btn_next ?? "Next"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Enquiry Dialog */}
      {enquiryDialog.expert && (
        <ExpertEnquiryDialog
          open={enquiryDialog.open}
          onOpenChange={(open) => setEnquiryDialog((s) => ({ ...s, open }))}
          expertId={enquiryDialog.expert.id}
          expertName={enquiryDialog.expert.name}
        />
      )}
      {bookingDialog.expert && (
        <ExpertBookingDialog
          open={bookingDialog.open}
          onOpenChange={(open) => setBookingDialog((s) => ({ ...s, open }))}
          expertId={bookingDialog.expert.id}
          expertName={bookingDialog.expert.name}
        />
      )}
      {bookingsListDialog.expert && (
        <ExpertBookingsListDialog
          open={bookingsListDialog.open}
          onOpenChange={(open) => setBookingsListDialog((s) => ({ ...s, open }))}
          expertName={bookingsListDialog.expert.name}
          bookings={bookingsByExpertId.get(bookingsListDialog.expert.id) ?? []}
        />
      )}
    </div>
  );
}
