"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { fpoDashboardApi } from "@/app/fpo/_api/dashboard";
import { expertsApi } from "@/lib/api/experts";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpertEnquiryDialog } from "@/components/ui/expert-enquiry-dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { DISTRICT_OPTIONS, type FpoExpert } from "@/types/fpo";

type T = Record<string, string>;

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

const DISTRICT_SELECT_OPTIONS = [
  { value: "", label: "All Districts" },
  ...DISTRICT_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
];

function ExpertSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-28 mt-2" />
    </div>
  );
}

function ExpertCard({
  expert,
  isApprovedFpo,
  onContact,
  t,
}: {
  expert: FpoExpert;
  isApprovedFpo: boolean;
  onContact: (expert: FpoExpert) => void;
  t: T;
}) {
  const badgeClass = CATEGORY_BADGE_COLORS[expert.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="font-semibold text-base leading-snug truncate">{expert.name}</h3>
          {expert.designation && <p className="text-xs text-muted-foreground truncate">{expert.designation}</p>}
          {expert.organisation && (
            <p className="text-xs text-muted-foreground truncate">{expert.organisation}</p>
          )}
        </div>
        <Badge className={`w-fit shrink-0 text-xs font-medium border ${badgeClass}`} variant="outline">
          {expert.category_display}
        </Badge>
      </div>

      {expert.district && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {DISTRICT_OPTIONS.find((d) => d.value === expert.district)?.label ?? expert.district}
        </div>
      )}

      {expert.primary_expertise && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.label_expertise ?? "Expertise"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{expert.primary_expertise}</p>
        </div>
      )}

      <div className="mt-auto pt-2">
        {isApprovedFpo ? (
          <Button size="sm" variant="default" onClick={() => onContact(expert)}>
            {t.btn_contact ?? "Contact Expert"}
          </Button>
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
    </div>
  );
}

export default function FpoExpertsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [activeCategory, setActiveCategory] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_experts,common")
      .then((data) => setT(data.fpo_experts ?? {}))
      .catch(() => undefined);
  }, [locale]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [enquiryDialog, setEnquiryDialog] = useState<{ open: boolean; expert: FpoExpert | null }>({
    open: false,
    expert: null,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["fpo-dashboard"],
    queryFn: fpoDashboardApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const isApprovedFpo = dashboard?.profile?.status === "approved";

  const { data: experts, isLoading } = useQuery({
    queryKey: ["fpo-experts", activeCategory, district, search],
    queryFn: () =>
      expertsApi.list({
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(district ? { district } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 5 * 60 * 1000,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function handleContact(expert: FpoExpert) {
    if (!isApprovedFpo) {
      toast.error(t.enquiry_not_approved ?? "Your FPO must be approved to contact experts.");
      return;
    }
    setEnquiryDialog({ open: true, expert });
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Expert Directory"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Connect with agricultural experts and KAU specialists"}
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
              options={DISTRICT_SELECT_OPTIONS}
              placeholder={t.district_placeholder ?? "All Districts"}
            />
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder={t.search_placeholder ?? "Search experts…"}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              {t.btn_search ?? "Search"}
            </Button>
          </form>
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
            {(activeCategory || district || search) ? (t.empty_filtered ?? "No experts match your search. Try adjusting your filters.") : (t.empty_state ?? "No experts found.")}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert) => (
            <ExpertCard
              key={expert.id}
              expert={expert}
              isApprovedFpo={!!isApprovedFpo}
              onContact={handleContact}
              t={t}
            />
          ))}
        </div>
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
    </div>
  );
}
