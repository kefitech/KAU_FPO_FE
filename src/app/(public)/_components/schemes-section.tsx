"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";

import { schemesApi } from "@/lib/api/schemes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoScheme } from "@/types/fpo";

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700 border-blue-200",
  insurance: "bg-purple-100 text-purple-700 border-purple-200",
  marketing: "bg-green-100 text-green-700 border-green-200",
  infrastructure: "bg-orange-100 text-orange-700 border-orange-200",
  capacity_building: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function SchemeCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
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
          <span className="font-medium">By:</span> {scheme.administering_body}
        </p>
      )}
      {scheme.eligibility && (
        <p className="text-xs text-muted-foreground line-clamp-2">{scheme.eligibility}</p>
      )}
      <div className="mt-auto pt-2 flex items-center gap-2">
        <Link href="/fpo/schemes" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          Learn More <ArrowRight className="h-3 w-3" />
        </Link>
        {scheme.official_link && (
          <a
            href={scheme.official_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function SchemesSection() {
  const { data: schemes, isLoading } = useQuery({
    queryKey: ["public-schemes"],
    queryFn: () => schemesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const displaySchemes = schemes?.slice(0, 6) ?? [];

  return (
    <section className="py-16 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Government Schemes &amp; Subsidies</h2>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl">
              Discover government schemes and subsidies designed to support FPOs in Kerala.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/fpo/schemes">
              View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
              <SchemeCardSkeleton key={i} />
            ))}
          </div>
        ) : displaySchemes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displaySchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : null}

        <div className="text-center">
          <Button asChild>
            <Link href="/fpo/schemes">
              View All Schemes <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
