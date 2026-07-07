"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { languageApi } from "@/app/admin/_api/language";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { Language } from "@/types";

type T = Record<string, string>;

function LanguageActions({ language, t, tCommon }: { language: Language; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const toggleMutation = useMutation({
    mutationFn: () => (language.is_active ? languageApi.deactivate(language.id) : languageApi.activate(language.id)),
    onSuccess: () => {
      toast.success(`Language ${language.is_active ? "deactivated" : "activated"}`);
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });
  const handleToggle = () => {
    if (language.is_active && language.is_default) {
      toast.error("A default language cannot be deactivated. Please set another language as default first.");
      return;
    }
    toggleMutation.mutate();
  };

  const defaultMutation = useMutation({
    mutationFn: () => languageApi.setDefault(language.id),
    onSuccess: () => {
      toast.success(`"${language.name}" set as default`);
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const handleSetDefault = () => {
    if (!language.is_active) {
      toast.error("An inactive language cannot be set as default. Please activate the language first.");
      return;
    }
    defaultMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: () => languageApi.delete(language.id),
    onSuccess: () => {
      toast.success(`"${language.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/languages/${language.id}/edit`) },
        {
          label: t.action_set_default ?? "Set as Default",
          onClick: handleSetDefault,
          hidden: language.is_default,
        },
        {
          label: language.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: handleToggle,
        },
      ]}
    />
  );
}

export function getLanguageColumns(t: T = {}, tCommon: T = {}): ColumnDef<Language>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          {row.original.name}
          {row.original.is_default && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: t.col_code ?? "Code",
      cell: ({ row }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.original.code}</code>,
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            {tCommon.badge_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      accessorKey: "is_default",
      header: t.col_default ?? "Default",
      cell: ({ row }) =>
        row.original.is_default ? (
          <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
            {t.badge_default ?? "Default"}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <LanguageActions language={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
