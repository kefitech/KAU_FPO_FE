"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { LinkageFPO } from "@/app/admin/_api/market-linkage";

type T = Record<string, string>;

export function getLinkageFPOColumns(t: T = {}): ColumnDef<LinkageFPO>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "FPO Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
  ];
}
