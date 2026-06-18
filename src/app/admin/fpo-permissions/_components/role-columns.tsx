"use client";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";

import { CodeCell, StatusBadge } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FpoMemberRole } from "@/types/admin";

type T = Record<string, string>;

interface RoleCallbacks {
  onEdit: (role: FpoMemberRole) => void;
  onToggleActive: (role: FpoMemberRole) => void;
  onDelete: (role: FpoMemberRole) => void;
}

function TranslationsCell({ role, t }: { role: FpoMemberRole; t: T }) {
  const router = useRouter();
  const langs = role.translations as string[];

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/admin/languages?tab=translations&category=9&search=${role.code}`);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="flex cursor-pointer flex-wrap gap-1" onClick={handleClick}>
            {langs.length > 0 ? (
              langs.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
                >
                  {lang}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground/60 italic">{t.no_translations ?? "None"}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {t.click_to_add_translations ?? "Click to add translations"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FpoRoleRowActions({
  role,
  t,
  tCommon,
  callbacks,
}: {
  role: FpoMemberRole;
  t: T;
  tCommon: T;
  callbacks: RoleCallbacks;
}) {
  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => callbacks.onEdit(role) },
        {
          label: role.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: () => callbacks.onToggleActive(role),
        },
        {
          label: tCommon.delete_btn ?? "Delete",
          onClick: () => callbacks.onDelete(role),
          destructive: true,
          separator: true,
        },
      ]}
    />
  );
}

export function getRoleColumns(t: T = {}, tCommon: T = {}, callbacks: RoleCallbacks): ColumnDef<FpoMemberRole>[] {
  return [
    {
      accessorKey: "code",
      header: t.col_code ?? "Code",
      cell: ({ row }) => <CodeCell value={row.original.code} />,
    },
    {
      accessorKey: "translations",
      meta: { width: "120px" },
      header: t.col_translations ?? "Languages",
      enableSorting: false,
      cell: ({ row }) => <TranslationsCell role={row.original} t={t} />,
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <StatusBadge
          active={row.original.is_active}
          labelActive={tCommon.badge_active ?? "Active"}
          labelInactive={tCommon.badge_inactive ?? "Inactive"}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <FpoRoleRowActions role={row.original} t={t} tCommon={tCommon} callbacks={callbacks} />,
    },
  ];
}
