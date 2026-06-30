"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { adminOwnershipClaimsApi } from "@/app/admin/_api/ownership-claims";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminOwnershipClaim } from "@/types/admin";

import { ClaimReviewDialog } from "./_components/claim-review-dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<AdminOwnershipClaim["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OwnershipClaimsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<AdminOwnershipClaim | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-ownership-claims", statusFilter, page],
    queryFn: () =>
      adminOwnershipClaimsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const claims = data?.data ?? [];
  const totalPages = data?.meta?.pagination?.total_pages ?? 1;
  const totalCount = data?.meta?.pagination?.total_count ?? 0;

  function handleFilterChange(f: StatusFilter) {
    setStatusFilter(f);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="font-bold text-2xl">Ownership Claims</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${totalCount} total claim${totalCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFilterChange(f.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claimant</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>FPO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Submitted</TableHead>
              <TableHead className="w-20 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                  No {statusFilter !== "all" ? statusFilter : ""} claims found.
                </TableCell>
              </TableRow>
            ) : (
              claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.claimant_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{claim.claimant_email}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {claim.claimant_phone || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{claim.fpo_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_BADGE[claim.status]}>
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {new Date(claim.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={claim.status === "pending" ? "default" : "outline"}
                      onClick={() => setReviewing(claim)}
                    >
                      {claim.status === "pending" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ClaimReviewDialog
        claim={reviewing}
        onOpenChange={(open) => {
          if (!open) setReviewing(null);
        }}
      />
    </div>
  );
}
