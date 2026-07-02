import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminAnnouncement } from "@/app/admin/_api/announcements";

type T = Record<string, string>;

interface ColumnActions {
  onEdit: (item: AdminAnnouncement) => void;
  onDelete: (item: AdminAnnouncement) => void;
  t: T;
  tCommon: T;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function getAnnouncementColumns({ onEdit, onDelete, t, tCommon }: ColumnActions): ColumnDef<AdminAnnouncement>[] {
  return [
    {
      accessorKey: "title",
      header: t.col_title ?? "Title",
      cell: ({ row }) => {
        const title = row.original.title;
        const text = typeof title === "string" ? title : (Object.values(title)[0] ?? "—");
        return <span className="line-clamp-1 max-w-xs">{text}</span>;
      },
    },
    {
      accessorKey: "category",
      header: t.col_category ?? "Category",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.category_display ?? row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "published_date",
      header: t.col_published ?? "Published",
      cell: ({ row }) => formatDate(row.original.published_date),
    },
    {
      accessorKey: "order",
      header: t.col_order ?? "Order",
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{tCommon.badge_active ?? "Active"}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">{tCommon.badge_inactive ?? "Inactive"}</Badge>
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t.action_edit ?? "Edit"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.action_delete ?? "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
