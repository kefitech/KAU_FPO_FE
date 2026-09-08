"use client";

import { Suspense, useState } from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ViewSheet } from "@/components/ui/view-sheet";
import type { AssignedFPO } from "@/types/cbbo";

function statusBadge(status: string, label: string) {
  const map: Record<string, string> = {
    submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
    info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return (
    <Badge variant="outline" className={`text-[11px] ${map[status] ?? "border-muted text-muted-foreground"}`}>
      {label}
    </Badge>
  );
}

const columns: ColumnDef<AssignedFPO>[] = [
  {
    accessorKey: "name",
    header: "FPO Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "application_id",
    header: "Application ID",
    meta: { hideOnMobile: true },
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.application_id}</span>,
  },
  {
    accessorKey: "district_display",
    header: "District",
    meta: { hideOnMobile: true },
    cell: ({ row }) => <span className="text-sm">{row.original.district_display ?? row.original.district}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => statusBadge(row.original.status, row.original.status_display),
  },
  {
    accessorKey: "total_members",
    header: "Members",
    meta: { hideOnMobile: true },
    cell: ({ row }) => <span className="text-sm">{row.original.total_members}</span>,
  },
  {
    accessorKey: "updated_at",
    header: "Updated",
    meta: { hideOnMobile: true },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{new Date(row.original.updated_at).toLocaleDateString()}</span>
    ),
  },
];

export default function CBBOVerificationsPage() {
  const router = useRouter();
  const [view, setView] = useState<{ open: boolean; row: AssignedFPO | null }>({ open: false, row: null });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">FPO Verifications</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">FPOs in your assigned districts</p>
      </div>

      <Suspense>
        <DataTable
          queryKey="cbbo-fpos"
          queryFn={cbboFposApi.getAll}
          columns={columns}
          onRowClick={(row) => setView({ open: true, row })}
        />
      </Suspense>

      <ViewSheet
        open={view.open}
        onOpenChange={(open) => setView((s) => ({ ...s, open }))}
        title={view.row?.name ?? "FPO Details"}
        actions={
          view.row
            ? [{ label: "Submit Report", onClick: () => router.push(`/cbbo/reports/new?fpo_id=${view.row?.id}`) }]
            : []
        }
        fields={
          view.row
            ? [
                { label: "Application ID", value: view.row.application_id },
                { label: "District", value: view.row.district_display ?? view.row.district },
                { label: "Status", value: view.row.status_display },
                { label: "Total Members", value: String(view.row.total_members) },
                { label: "Tier", value: view.row.tier ?? "—" },
                { label: "Last Updated", type: "date", value: view.row.updated_at },
              ]
            : []
        }
      />
    </div>
  );
}
