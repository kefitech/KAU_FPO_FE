"use client";

/**
 * Admin — Single FPO's DPR activity + project list.
 *
 * Drill-down from /admin/dpr/projects. Header + stat tiles + 12-month bar
 * chart come from the roll-up detail endpoint; the DPR project list is
 * rendered through the shared `<DataTable>` (fed by the flat projects
 * endpoint with `?fpo_id=` scope) so it gets pagination, search and
 * column toggles for free — same style as every other admin table.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import type { ComponentType } from "react";
import { use, useMemo } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  PencilLine,
  Send,
} from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  DPR_STATUS_COLORS,
  DPR_STATUS_LABELS,
  type DPRProjectRow,
  type DPRProjectStatus,
} from "@/app/admin/_api/dpr-projects";
import { DataTable } from "@/components/data-table";
import { GradientBarChart } from "@/components/shared/gradient-bar-chart";
import type { FilterConfig } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

// Columns for the DPR projects table. Same shape as the flat list minus
// the FPO column — everything below the header is already scoped to one
// FPO by the `fpo_id` filter passed to `getAll`.
function projectColumns(): ColumnDef<DPRProjectRow>[] {
  return [
    {
      accessorKey: "title",
      header: "DPR Title",
      enableSorting: false,
      cell: ({ row }) => (
        <span
          className="block max-w-[320px] truncate font-medium"
          title={row.original.title || undefined}
        >
          {row.original.title || (
            <span className="italic text-muted-foreground">Untitled</span>
          )}
        </span>
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
      accessorKey: "created_at",
      header: "Created",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
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

interface PageProps {
  params: Promise<{ fpo_id: string }>;
}

export default function AdminFpoDprDetailPage({ params }: PageProps) {
  const { fpo_id } = use(params);
  const fpoId = Number(fpo_id);

  const query = useQuery({
    queryKey: ["admin-dpr-projects-fpos-detail", fpoId],
    queryFn: () => adminDprProjectsApi.getFpoDetail(fpoId),
    enabled: !Number.isNaN(fpoId),
    staleTime: 30_000,
  });

  const cols = useMemo(() => projectColumns(), []);

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: (
          Object.keys(DPR_STATUS_LABELS) as DPRProjectStatus[]
        ).map((s) => ({ value: s, label: DPR_STATUS_LABELS[s] })),
      },
    ],
    [],
  );

  // Bind the DataTable queryFn to this FPO so pagination / search all
  // stay scoped. The backend `DPRProjectAdminListView` accepts `fpo_id`.
  const projectsQueryFn = useMemo(
    () =>
      (dtParams: DataTableParams): Promise<PaginatedResponse<DPRProjectRow>> =>
        adminDprProjectsApi.getAll({ ...dtParams, fpo_id: fpoId }),
    [fpoId],
  );

  const data = query.data;
  const chartData = (data?.monthly_counts ?? []).map((m) => ({
    label: monthLabel(m.month),
    value: m.count,
  }));

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1
            className="max-w-[640px] truncate font-bold text-2xl"
            title={data?.fpo.name}
          >
            {data?.fpo.name ?? (query.isLoading ? "Loading…" : "FPO not found")}
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {data?.fpo.district || "—"}
            {data?.fpo.tier ? ` · ${data.fpo.tier}` : ""}
            {data?.fpo.application_id ? ` · ${data.fpo.application_id}` : ""}
          </p>
        </div>
      </div>

      {!data && !query.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            This FPO doesn&apos;t exist or you don&apos;t have access.
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* ── Stat tiles ─────────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile
              label="Total DPRs"
              value={data.stats.total_dprs}
              tone="blue"
              icon={FileText}
            />
            <StatTile
              label="Drafts"
              value={
                (data.stats.by_status.draft ?? 0) +
                (data.stats.by_status.in_progress ?? 0)
              }
              tone="amber"
              icon={PencilLine}
            />
            <StatTile
              label="Submitted"
              value={data.stats.by_status.submitted ?? 0}
              tone="violet"
              icon={Send}
            />
            <StatTile
              label="Generated"
              value={data.stats.generated_dprs}
              tone="emerald"
              icon={CheckCircle2}
            />
          </div>

          {/* ── Bar chart ─────────────────────────────────────────────── */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold">DPRs created — last 12 months</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Counted by DPR creation date.
                </p>
              </div>
              <GradientBarChart data={chartData} valueLabel="DPRs created" />
            </CardContent>
          </Card>

          {/* ── Project list — DataTable ──────────────────────────────── */}
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">DPR projects</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Every DPR this FPO has created. Same table style as the rest of
                the admin surface — sort, filter, search, column toggles.
              </p>
            </div>
            <DataTable
              queryKey={`admin-dpr-projects-fpo-${fpoId}`}
              queryFn={projectsQueryFn}
              columns={cols}
              filters={filters}
              columnsLabel="Columns"
              toggleColumnsLabel="Toggle columns"
              searchPlaceholder="Search DPR title…"
              clearLabel="Clear"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Per-tone Tailwind class bundle. Kept as full literal strings so
// Tailwind's static analyser sees every class at build time — dynamic
// `bg-${tone}-500` patterns get purged in production.
const TILE_TONES = {
  blue: {
    ring: "from-blue-500/10 via-blue-500/5 to-transparent",
    accent: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  },
  amber: {
    ring: "from-amber-500/10 via-amber-500/5 to-transparent",
    accent: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
  violet: {
    ring: "from-violet-500/10 via-violet-500/5 to-transparent",
    accent: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  },
  emerald: {
    ring: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    accent: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
} as const;

type TileTone = keyof typeof TILE_TONES;

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: TileTone;
  icon: ComponentType<{ className?: string }>;
}) {
  const t = TILE_TONES[tone];
  return (
    <Card className="relative overflow-hidden">
      {/* Left accent stripe — one crisp coloured edge per metric so a quick
          glance at the row reads as a legend without needing labels. */}
      <span className={`absolute inset-y-0 left-0 w-1 ${t.accent}`} />
      {/* Soft radial-ish tint fills the tile with the tone's colour at low
          opacity. Purely decorative — sits under the content. */}
      <span
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.ring}`}
      />
      <CardContent className="relative flex items-center justify-between gap-3 p-4 pl-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-1 text-3xl font-bold leading-none ${t.text}`}>
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.iconBg}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
