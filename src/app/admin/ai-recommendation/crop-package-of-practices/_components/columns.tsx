import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { CropPackageOfPractices } from "@/app/admin/_api/crop-package-of-practices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type T = Record<string, string>;

interface ColumnActions {
  onEdit: (item: CropPackageOfPractices) => void;
  onDelete: (item: CropPackageOfPractices) => void;
  onToggleStatus: (item: CropPackageOfPractices) => void;
  t: T;
  tCommon: T;
}

export function getCropPackageOfPracticesColumns({
  onEdit,
  onDelete,
  onToggleStatus,
  t,
  tCommon,
}: ColumnActions): ColumnDef<CropPackageOfPractices>[] {
  return [
    {
      accessorKey: "crop_name",
      header: t.col_crop_name ?? "Crop",
      meta: { width: "25%" },
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.crop_name}</span>,
    },
    {
      accessorKey: "crop_group",
      header: t.col_crop_group ?? "Group",
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.crop_group || "—",
    },
    {
      accessorKey: "source_page_range",
      header: t.col_source_pages ?? "Source Pages",
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.source_page_range || "—",
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
