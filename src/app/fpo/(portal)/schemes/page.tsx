"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search, X } from "lucide-react";

import { schemesApi } from "@/lib/api/schemes";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSheet } from "@/components/ui/view-sheet";
import type { SheetField } from "@/components/ui/view-sheet";
import type { FpoScheme } from "@/types/fpo";

type T = Record<string, string>;

const SCHEME_CATEGORIES = [
  { value: "", label: "All Schemes" },
  { value: "credit", label: "Credit & Finance" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing & Trade" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "capacity_building", label: "Capacity Building" },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700 border-blue-200",
  insurance: "bg-purple-100 text-purple-700 border-purple-200",
  marketing: "bg-green-100 text-green-700 border-green-200",
  infrastructure: "bg-orange-100 text-orange-700 border-orange-200",
  capacity_building: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function SchemeSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-28 mt-2" />
    </div>
  );
}

function buildSchemeFields(scheme: FpoScheme, t: T): SheetField[] {
  const fields: SheetField[] = [];

  fields.push({ label: "Category", type: "node", node: (
    <Badge className={`w-fit text-xs font-medium border ${CATEGORY_BADGE_COLORS[scheme.category] ?? "bg-muted text-muted-foreground"}`} variant="outline">
      {scheme.category_display}
    </Badge>
  )});

  if (scheme.administering_body) {
    fields.push({ label: t.card_administered_by ?? "Administered By", type: "text", value: scheme.administering_body });
  }
  if (scheme.objective) {
    fields.push({ label: t.detail_objective ?? "Objective", type: "text", value: scheme.objective });
  }
  if (scheme.eligibility) {
    fields.push({ label: t.card_eligibility ?? "Eligibility", type: "text", value: scheme.eligibility });
  }
  if (scheme.benefit_details) {
    fields.push({ label: t.card_benefits ?? "Benefits", type: "text", value: scheme.benefit_details });
  }
  if (scheme.application_process) {
    fields.push({ label: t.detail_how_to_apply ?? "How to Apply", type: "text", value: scheme.application_process });
  }
  if (scheme.last_updated) {
    fields.push({ label: t.detail_last_updated ?? "Last Updated", type: "date", value: scheme.last_updated });
  }

  return fields;
}

function SchemeCard({ scheme, t, onViewDetails }: { scheme: FpoScheme; t: T; onViewDetails: () => void }) {
  const badgeClass = CATEGORY_BADGE_COLORS[scheme.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 p-5">
      <Badge className={`w-fit text-xs font-medium border ${badgeClass}`} variant="outline">
        {scheme.category_display}
      </Badge>
      <h3 className="font-semibold text-base leading-snug">{scheme.name}</h3>
      {scheme.administering_body && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{t.card_administered_by ?? "Administered by:"}</span> {scheme.administering_body}
        </p>
      )}
      {scheme.eligibility && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.card_eligibility ?? "Eligibility"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.eligibility}</p>
        </div>
      )}
      {scheme.benefit_details && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">{t.card_benefits ?? "Benefits"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.benefit_details}</p>
        </div>
      )}
      <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onViewDetails}>
        {t.btn_view_details ?? "View Details"}
      </Button>
      {scheme.official_link && (
        <Button variant="ghost" size="sm" asChild className="h-auto min-w-0 max-w-full whitespace-normal">
          <a href={scheme.official_link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <span className="min-w-0 break-words">{t.btn_visit ?? "Website"}</span>
          </a>
        </Button>
      )}
    </div>
    </div>
  );
}

export default function FpoSchemesPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<FpoScheme | null>(null);

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_schemes,common")
      .then((data) => setT(data.fpo_schemes ?? {}))
      .catch(() => undefined);
  }, [locale]);

  // Debounce searchInput -> search, so the query re-fires automatically as
  // the user types (after a short pause) instead of needing a submit button.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["fpo-schemes", locale, activeCategory, search],
    queryFn: () =>
      schemesApi.list({
        locale,
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 5 * 60 * 1000,
  });

  const sheetActions = selectedScheme?.official_link
    ? [{ label: t.btn_visit ?? "Visit Website", icon: ExternalLink, variant: "outline" as const, onClick: () => window.open(selectedScheme.official_link, "_blank") }]
    : undefined;

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Government Schemes"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Browse government schemes and subsidies available to FPOs"}
        </p>
      </div>

      {/* Filters */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {SCHEME_CATEGORIES.map((cat) => (
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
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 pr-8 h-8 text-sm"
              placeholder={t.search_placeholder ?? "Search schemes…"}
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
        </div>

      {/* Scheme Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <SchemeSkeleton key={i} />
          ))}
        </div>
      ) : !schemes || schemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-muted-foreground text-sm">{t.empty_state ?? "No schemes found."}</p>
          {(activeCategory || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveCategory("");
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
          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              t={t}
              onViewDetails={() => setSelectedScheme(scheme)}
            />
          ))}
        </div>
      )}

      <ViewSheet
        open={!!selectedScheme}
        onOpenChange={(v) => { if (!v) setSelectedScheme(null); }}
        title={selectedScheme?.name ?? ""}
        fields={selectedScheme ? buildSchemeFields(selectedScheme, t) : []}
        actions={sheetActions}
      />
    </div>
  );
}