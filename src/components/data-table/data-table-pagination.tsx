"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  isLoading,
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Skeleton className="h-5 w-36" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-20" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const NavButtons = () => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={page <= 1}>
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {/* Mobile: row 1 — showing count + nav buttons */}
      <div className="flex items-center justify-between sm:contents">
        <p className="text-muted-foreground text-sm">
          {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
        </p>
        <div className="sm:hidden">
          <NavButtons />
        </div>
      </div>

      {/* Mobile: row 2 — rows per page + page X of Y | Desktop: right side */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm whitespace-nowrap">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page X of Y */}
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>

        {/* Nav buttons — desktop only (mobile rendered above) */}
        <div className="hidden sm:flex">
          <NavButtons />
        </div>
      </div>
    </div>
  );
}
