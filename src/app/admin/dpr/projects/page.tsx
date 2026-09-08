"use client";

/**
 * Admin — DPR Projects list.
 *
 * Read-only oversight of every DPR project across all FPOs. Uses the shared
 * `<DataTable>` component (same pattern as audit-logs / external-apis) so
 * pagination, search, filter chips, sortable columns and column visibility
 * toggles come for free.
 *
 * Filters: status, district. Search: FPO name / DPR title contains.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  DPR_STATUS_COLORS,
  DPR_STATUS_LABELS,
  type DPRProjectRow,
  type DPRProjectStatus,
} from "@/app/admin/_api/dpr-projects";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";

function columns(): ColumnDef<DPRProjectRow>[] {
  return [
    {
      accessorKey: "fpo",
      header: "FPO",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.fpo?.name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "DPR Title",
      cell: ({ row }) =>
        row.original.title || (
          <span className="text-muted-foreground italic">Untitled</span>
        ),
    },
    {
      accessorKey: "district",
      header: "District",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.fpo?.district ?? "—"}</span>
      ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.fpo?.tier ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={`text-[11px] font-medium ${DPR_STATUS_COLORS[row.original.status]}`}
        >
          {DPR_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {new Date(row.original.updated_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/dpr/projects/${row.original.uuid}`}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
          </Link>
        </Button>
      ),
    },
  ];
}

export default function AdminDprProjectsPage() {
  const cols = useMemo(() => columns(), []);

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: (Object.keys(DPR_STATUS_LABELS) as DPRProjectStatus[]).map((s) => ({
          value: s,
          label: DPR_STATUS_LABELS[s],
        })),
      },
      {
        key: "district",
        label: "District",
        type: "select",
        options: KERALA_DISTRICTS.map((d) => ({
          value: d.code,
          label: `${d.name} (${d.code})`,
        })),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-2xl">DPR Projects</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Read-only oversight of every DPR project across all FPOs. Filter by status or
            district; search by FPO name or DPR title.
          </p>
        </div>
      </div>

      <DataTable
        queryKey="admin-dpr-projects"
        queryFn={adminDprProjectsApi.getAll}
        columns={cols}
        filters={filters}
        columnsLabel="Columns"
        toggleColumnsLabel="Toggle columns"
        searchPlaceholder="Search FPO name or DPR title…"
        clearLabel="Clear"
      />
    </div>
  );
}
