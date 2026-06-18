"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";

import { schemesApi } from "@/lib/api/schemes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoScheme } from "@/types/fpo";

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

function SchemeCard({ scheme }: { scheme: FpoScheme }) {
  const badgeClass = CATEGORY_BADGE_COLORS[scheme.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 p-5">
      <Badge className={`w-fit text-xs font-medium border ${badgeClass}`} variant="outline">
        {scheme.category_display}
      </Badge>
      <h3 className="font-semibold text-base leading-snug">{scheme.name}</h3>
      {scheme.administering_body && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Administered by:</span> {scheme.administering_body}
        </p>
      )}
      {scheme.eligibility && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">Eligibility</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.eligibility}</p>
        </div>
      )}
      {scheme.benefit_details && (
        <div>
          <p className="text-xs font-medium text-foreground mb-0.5">Benefits</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{scheme.benefit_details}</p>
        </div>
      )}
      {scheme.official_link && (
        <div className="mt-auto pt-2">
          <Button variant="outline" size="sm" asChild>
            <a href={scheme.official_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Visit Website
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function FpoSchemesPage() {
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["fpo-schemes", activeCategory, search],
    queryFn: () =>
      schemesApi.list({
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 5 * 60 * 1000,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Government Schemes</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Browse government schemes and subsidies available to FPOs
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category filter tabs */}
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

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-64">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search schemes…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8">
            Search
          </Button>
        </form>
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
          <p className="text-muted-foreground text-sm">No schemes found.</p>
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
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}
    </div>
  );
}
