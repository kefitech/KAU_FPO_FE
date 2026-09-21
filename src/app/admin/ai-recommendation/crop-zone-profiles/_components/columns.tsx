import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { CropZoneProfile } from "@/app/admin/_api/crop-zone-profiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type T = Record<string, string>;

interface ColumnActions {
  onEdit: (item: CropZoneProfile) => void;
  onDelete: (item: CropZoneProfile) => void;
  onToggleStatus: (item: CropZoneProfile) => void;
  t: T;
  tCommon: T;
}

export function getCropZoneProfileColumns({ onEdit, onDelete, onToggleStatus, t, tCommon }: ColumnActions): ColumnDef<CropZoneProfile>[] {
  return [
    {
      accessorKey: "crop_name",
      header: t.col_crop_name ?? "Crop",
      meta: { width: "20%" },
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.crop_name}</span>,
    },
    {
      accessorKey: "kau_zone",
      header: t.col_kau_zone ?? "KAU Zone",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.kau_zone}
        </Badge>
      ),
    },
    {
      accessorKey: "crop_group",
      header: t.col_crop_group ?? "Group",
      meta: { hideOnMobile: true },
    },
    {
      id: "temp_range",
      header: t.col_temp_range ?? "Temp (°C)",
      meta: { hideOnMobile: true },
      cell: ({ row }) => `${row.original.temp_lo}–${row.original.temp_hi}`,
    },
    {
      id: "ph_range",
      header: t.col_ph_range ?? "pH",
      meta: { hideOnMobile: true },
      cell: ({ row }) => `${row.original.ph_lo}–${row.original.ph_hi}`,
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{tCommon.badge_active ?? "Active"}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[190]">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t.action_edit ?? "Edit"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(row.original)}>
              {row.original.is_active ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  {t.action_deactivate ?? "Deactivate"}
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  {t.action_activate ?? "Activate"}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t.action_delete ?? "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
