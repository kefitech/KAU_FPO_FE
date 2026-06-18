"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { expertsApi } from "@/lib/api/experts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoExpert } from "@/types/fpo";

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  scientist: "bg-indigo-100 text-indigo-700 border-indigo-200",
  trainer: "bg-green-100 text-green-700 border-green-200",
  banker: "bg-blue-100 text-blue-700 border-blue-200",
  facilitator: "bg-teal-100 text-teal-700 border-teal-200",
};

function ExpertCardSkeleton() {
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
      <Skeleton className="h-8 w-28 mt-2" />
    </div>
  );
}

function ExpertCard({ expert }: { expert: FpoExpert }) {
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

      <div className="mt-auto pt-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/v1/login">Contact Expert</Link>
        </Button>
      </div>
    </div>
  );
}

export function ExpertsSection() {
  const { data: experts, isLoading } = useQuery({
    queryKey: ["public-experts"],
    queryFn: () => expertsApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const displayExperts = experts?.slice(0, 4) ?? [];

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">KAU Expert Directory</h2>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl">
              Connect with agricultural experts, scientists, and specialists from Kerala Agricultural University.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/fpo/experts">
              View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
              <ExpertCardSkeleton key={i} />
            ))}
          </div>
        ) : displayExperts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        ) : null}

        <div className="text-center">
          <Button asChild>
            <Link href="/fpo/experts">
              View All Experts <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
