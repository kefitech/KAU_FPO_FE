import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { AdminFaq } from "@/app/admin/_api/faqs";
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
  onEdit: (item: AdminFaq) => void;
  onDelete: (item: AdminFaq) => void;
  onToggleStatus: (item: AdminFaq) => void;
  t: T;
  tCommon: T;
}

export function getFaqColumns({ onEdit, onDelete, onToggleStatus, t, tCommon }: ColumnActions): ColumnDef<AdminFaq>[] {
  return [
    {
      accessorKey: "question",
      header: t.col_question ?? "Question",
      cell: ({ row }) => {
        const question = row.original.question;
        const text = typeof question === "string" ? question : (Object.values(question)[0] ?? "—");
        return <span className="line-clamp-2 max-w-xs text-sm">{text}</span>;
      },
    },
    {
      accessorKey: "category",
      header: t.col_category ?? "Category",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <Badge variant="outline">{row.original.category_display ?? row.original.category}</Badge>,
    },
    {
      accessorKey: "order",
      header: t.col_order ?? "Order",
      meta: { hideOnMobile: true },
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
          <DropdownMenuContent align="end">
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
