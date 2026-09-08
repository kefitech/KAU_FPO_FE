"use client";

import { Suspense } from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CBBOReportListItem } from "@/types/cbbo";

const columns: ColumnDef<CBBOReportListItem>[] = [
  {
    accessorKey: "fpo_name",
    header: "FPO",
    cell: ({ row }) => <span className="font-medium">{row.original.fpo_name}</span>,
  },
  {
    accessorKey: "district",
    header: "District",
    meta: { hideOnMobile: true },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <span className="text-sm">{new Date(row.original.date).toLocaleDateString()}</span>,
  },
  {
    accessorKey: "participants_count",
    header: "Participants",
    meta: { hideOnMobile: true },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "submitted" ? (
        <Badge
          variant="outline"
          className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
        >
          Submitted
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-700 dark:text-yellow-400"
        >
          Draft
        </Badge>
      ),
  },
];

export default function CBBOReportsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Reports</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">Capacity building reports you've filed</p>
        </div>
        <Button size="sm" onClick={() => router.push("/cbbo/reports/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Report
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="cbbo-reports"
          queryFn={cbboReportsApi.getAll}
          columns={columns}
          onRowClick={(row) => router.push(`/cbbo/reports/${row.id}`)}
        />
      </Suspense>
    </div>
  );
}
