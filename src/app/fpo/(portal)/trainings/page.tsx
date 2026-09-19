"use client";

import { Suspense } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { type FPOTrainingSession, fpoTrainingApi } from "@/app/fpo/_api/training";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

const columns: ColumnDef<FPOTrainingSession>[] = [
  {
    accessorKey: "topic",
    header: "Topic",
    cell: ({ row }) => <span className="font-medium">{row.original.topic}</span>,
  },
  {
    accessorKey: "trainer_name",
    header: "Trainer",
    meta: { hideOnMobile: true },
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.trainer_name || "—"}</span>,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => <span className="text-sm">{row.original.time || "—"}</span>,
  },
  {
    accessorKey: "duration_hours",
    header: "Duration",
    meta: { hideOnMobile: true },
    enableSorting: false,
    cell: ({ row }) => `${row.original.duration_hours}h`,
  },
  {
    accessorKey: "venue",
    header: "Venue",
    meta: { hideOnMobile: true },
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.venue || "—"}</span>,
  },
  {
    accessorKey: "participants_count",
    header: "Participants",
    enableSorting: false,
    cell: ({ row }) => <Badge variant="outline">{row.original.participants_count}</Badge>,
  },
  {
    accessorKey: "conducted_by_name",
    header: "Conducted By",
    meta: { hideOnMobile: true },
    enableSorting: false,
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.conducted_by_name}</span>,
  },
];

export default function FpoTrainingSessionsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">Training Sessions</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Training sessions scheduled for your FPO</p>
      </div>

      <Suspense>
        <DataTable
          queryKey="fpo-training-sessions"
          queryFn={fpoTrainingApi.getAll}
          columns={columns}
          searchPlaceholder="Search by topic..."
        />
      </Suspense>
    </div>
  );
}
