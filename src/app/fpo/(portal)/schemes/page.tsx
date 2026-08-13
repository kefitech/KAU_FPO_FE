"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { schemesApi } from "@/lib/api/schemes";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewSheet } from "@/components/ui/view-sheet";
import {
  SchemeCard,
  SchemeSkeleton,
  buildSchemeFields,
  SCHEME_CATEGORIES,
  CATEGORY_LABEL_KEYS,
  type T,
} from "@/components/schemes/scheme-card";
import type { FpoScheme } from "@/types/fpo";
import { ExternalLink } from "lucide-react";

export default function FpoSchemesPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<FpoScheme | null>(null);
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi.getPublic(locale, "fpo_schemes,common")
      .then((data) => setT(data.fpo_schemes ?? {}))
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

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

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div>
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="mt-1.5 h-4 w-80 rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {SCHEME_CATEGORIES.map((catValue) => (
              <div key={catValue} className="h-6 w-20 rounded-full bg-muted" />
            ))}
          </div>
          <div className="h-8 w-full rounded bg-muted sm:w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <SchemeSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-6 py-4 sm:py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Government Schemes"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Browse government schemes and subsidies available to FPOs"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {SCHEME_CATEGORIES.map((catValue) => (
            <button
              key={catValue}
              type="button"
              onClick={() => setActiveCategory(catValue)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                activeCategory === catValue
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              {t[CATEGORY_LABEL_KEYS[catValue].key] ?? CATEGORY_LABEL_KEYS[catValue].fallback}
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
              aria-label={t.aria_clear_search ?? "Clear search"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

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