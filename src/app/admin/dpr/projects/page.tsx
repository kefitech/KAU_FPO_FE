"use client";

/**
 * Admin — DPR Projects (FPO roll-up list).
 *
 * KAU 2026-09-21 UX split: this landing page shows one row per FPO with
 * their DPR totals. Clicking View drills into
 * /admin/dpr/projects/fpo/<fpo_id> which renders the activity chart and
 * that FPO's individual DPR projects.
 *
 * Backed by GET /api/admin/dpr/projects/fpos/ (paginated, DataTable-native).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { useMemo } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  type DPRProjectFpoRollupRow,
} from "@/app/admin/_api/dpr-projects";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";

function columns(): ColumnDef<DPRProjectFpoRollupRow>[] {
  return [
    {
      accessorKey: "name",
      header: "FPO",
      enableSorting: false,
      cell: ({ row }) => (
        // Truncate long names to a single ellipsised line; full name shown
        // as a native tooltip on hover so nothing is lost.
        <span
          className="block max-w-[220px] truncate font-medium"
          title={row.original.name}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "district",
      header: "District",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.district || "—"}</span>
      ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.tier ?? "—"}</span>
      ),
    },
    {
      accessorKey: "total_dprs",
      header: "Total",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[11px] font-semibold">
          {row.original.total_dprs}
        </Badge>
      ),
    },
    {
      accessorKey: "draft_dprs",
      header: "Draft",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.draft_dprs + row.original.in_progress_dprs}
        </span>
      ),
    },
    {
      accessorKey: "submitted_dprs",
      header: "Submitted",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.submitted_dprs}
        </span>
      ),
    },
    {
      accessorKey: "generated_dprs",
      header: "Generated",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        >
          {row.original.generated_dprs}
        </Badge>
      ),
    },
    {
      accessorKey: "last_updated",
      header: "Last activity",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.last_updated
            ? new Date(row.original.last_updated).toLocaleString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/dpr/projects/fpo/${row.original.id}`}>
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
            One row per FPO with DPR activity. Click <span className="font-medium">View</span> to
            see that FPO&apos;s activity chart and individual DPR projects.
          </p>
        </div>
      </div>

      <DataTable
        queryKey="admin-dpr-projects-fpos"
        queryFn={adminDprProjectsApi.getFpos}
        columns={cols}
        filters={filters}
        columnsLabel="Columns"
        toggleColumnsLabel="Toggle columns"
        searchPlaceholder="Search FPO name…"
        clearLabel="Clear"
      />
    </div>
  );
}
