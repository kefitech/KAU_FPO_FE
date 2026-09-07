"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { govtFposApi } from "@/app/government/_api/fpos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { govtReportsApi } from "@/app/government/_api/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GovernmentFPODirectoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["government", "fpos", "directory", search, statusFilter],
    queryFn: () =>
      govtFposApi.getAll({
        page: 1,
        page_size: 50,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const fpos = data?.data ?? [];
  const statusOptions = Array.from(
    new Map(fpos.map((f) => [f.status, f.status_display])).entries(),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">FPO Directory</h1>
          <p className="text-muted-foreground text-sm">
            Read-only view of FPOs in your jurisdiction
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => govtReportsApi.downloadFpoSummary({ file_format: "excel" })}>
            Export Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => govtReportsApi.downloadFpoSummary({ file_format: "pdf" })}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or application ID..."
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Loading FPOs...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn&apos;t load FPOs. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <CardContent className="p-0">
            {fpos.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">No FPOs found.</p>
            )}
            {fpos.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => router.push(`/government/fpos/${f.id}`)}
                className={`flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 ${
                  i !== fpos.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{f.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {f.district_display ?? f.district} · {f.application_id}
                  </p>
                </div>
                <Badge variant="outline">{f.status_display}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {data?.meta?.pagination && (
        <p className="text-muted-foreground text-xs">
          {data.meta.pagination.total_count} total FPO{data.meta.pagination.total_count === 1 ? "" : "s"} in your jurisdiction
        </p>
      )}
    </div>
  );
}