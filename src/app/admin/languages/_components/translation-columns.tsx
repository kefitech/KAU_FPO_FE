"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { translationApi } from "@/app/admin/_api/translation";
import { CodeCell, TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { Translation } from "@/types";

type T = Record<string, string>;

function TranslationActions({ translation, t, tCommon }: { translation: Translation; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const verifyMutation = useMutation({
    mutationFn: () => translationApi.verify(translation.id),
    onSuccess: () => {
      toast.success("Translation marked as verified");
      queryClient.invalidateQueries({ queryKey: ["translations"] });
    },
    onError: () => toast.error("Failed to verify"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => translationApi.delete(translation.id),
    onSuccess: () => {
      toast.success("Translation deleted");
      queryClient.invalidateQueries({ queryKey: ["translations"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: "Delete Translation",
      description: `Are you sure you want to delete the translation for "${translation.full_key}"? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/translations/${translation.id}/edit`) },
        {
          label: (
            <>
              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
              {t.action_verify ?? "Mark as Verified"}
            </>
          ),
          onClick: () => verifyMutation.mutate(),
          hidden: translation.is_verified,
        },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getTranslationColumns(t: T = {}, tCommon: T = {}): ColumnDef<Translation>[] {
  return [
    {
      accessorKey: "full_key",
      meta: { width: "22%" },
      header: t.col_key ?? "Key",
      cell: ({ row }) => <CodeCell value={row.original.full_key} />,
    },
    {
      accessorKey: "language_name",
      meta: { width: "12%" },
      header: t.col_language ?? "Language",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <TextCell value={row.original.language_name} maxWidth="max-w-[100px]" />
          <Badge variant="outline" className="shrink-0 px-1 py-0 font-mono text-xs">
            {row.original.language_code}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "category_name",
      meta: { width: "13%" },
      header: t.col_category ?? "Category",
      cell: ({ row }) => <TextCell value={row.original.category_name} muted />,
    },
    {
      accessorKey: "value",
      meta: { width: "35%" },
      header: t.col_value ?? "Value",
      cell: ({ row }) => <TextCell value={row.original.value} maxWidth="max-w-[300px]" />,
    },
    {
      accessorKey: "is_verified",
      meta: { width: "110px" },
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_verified ? (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            <ShieldCheck className="mr-1 h-3 w-3" />
            {t.badge_verified ?? "Verified"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {t.badge_unverified ?? "Unverified"}
          </Badge>
        ),
    },
    {
      id: "actions",
      meta: { width: "48px" },
      header: "",
      cell: ({ row }) => <TranslationActions translation={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
