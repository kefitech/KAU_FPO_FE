"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { externalApisApi } from "@/app/admin/_api/external-apis";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { ExternalApi } from "@/types/admin";

import { ExternalApiDialog } from "./_components/external-api-dialog";

type T = Record<string, string>;

function ExternalApiRow({
  item,
  t,
  tCommon,
  onView,
  onEdit,
}: {
  item: ExternalApi;
  t: T;
  tCommon: T;
  onView: (item: ExternalApi) => void;
  onEdit: (item: ExternalApi) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => externalApisApi.activate(item.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "External API activated");
      queryClient.invalidateQueries({ queryKey: ["external-apis"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => externalApisApi.deactivate(item.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "External API deactivated");
      queryClient.invalidateQueries({ queryKey: ["external-apis"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  function handleToggle() {
    if (item.is_active) {
      confirm({
        title: t.deactivate_title ?? "Deactivate API",
        description: (
          t.deactivate_description ?? 'Deactivate "{name}"? Live verification will fall back to format-only validation.'
        ).replace("{name}", item.service_display),
        onConfirm: () => deactivateMutation.mutateAsync(),
      });
    } else {
      activateMutation.mutate();
    }
  }

  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <tr
      className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
      onClick={() => onView(item)}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{item.service_display}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{item.service}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {item.api_url ? (
          <span className="max-w-xs truncate font-mono text-muted-foreground text-xs">{item.api_url}</span>
        ) : (
          <span className="text-muted-foreground text-xs italic">{t.no_url ?? "Not set"}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {item.is_active ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            {tCommon.badge_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-muted-foreground text-xs">{new Date(item.updated_at).toLocaleDateString()}</span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <RowActions
            actions={[
              { label: tCommon.edit ?? "Edit", onClick: () => onEdit(item) },
              {
                label: item.is_active ? (tCommon.deactivate ?? "Deactivate") : (tCommon.activate ?? "Activate"),
                onClick: handleToggle,
                disabled: isPending,
                separator: true,
              },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <>
      {(["a", "b", "c"] as const).map((k) => (
        <tr key={k} className="border-b last:border-0">
          <td className="px-4 py-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-48" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-14 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-20" />
          </td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function ExternalApisPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [dialog, setDialog] = useState<{ open: boolean; editing: ExternalApi | null }>({
    open: false,
    editing: null,
  });
  const [viewSheet, setViewSheet] = useState<{ open: boolean; row: ExternalApi | null }>({
    open: false,
    row: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "external_apis_table,common")
      .then((data) => {
        setT(data.external_apis_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["external-apis"],
    queryFn: externalApisApi.getAll,
    staleTime: 30 * 1000,
  });

  const items = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "External APIs"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage third-party service integrations for verification and data lookup"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {tCommon.refresh_btn ?? "Refresh"}
          </Button>
          <Button size="sm" onClick={() => setDialog({ open: true, editing: null })}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.add_button ?? "Add External API"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t.col_service ?? "Service"}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t.col_api_url ?? "API URL"}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t.col_status ?? "Status"}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t.col_updated ?? "Last Updated"}
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t.col_actions ?? "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  {t.empty_state ?? 'No external APIs configured yet. Click "Add External API" to get started.'}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <ExternalApiRow
                  key={item.id}
                  item={item}
                  t={t}
                  tCommon={tCommon}
                  onView={(i) => setViewSheet({ open: true, row: i })}
                  onEdit={(i) => setDialog({ open: true, editing: i })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <ExternalApiDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        editing={dialog.editing}
        t={t}
        tCommon={tCommon}
      />

      <ViewSheet
        open={viewSheet.open}
        onOpenChange={(open) => setViewSheet((s) => ({ ...s, open }))}
        title={t.view_title ?? "External API Details"}
        actions={
          viewSheet.row
            ? [
                {
                  label: tCommon.edit ?? "Edit",
                  icon: Pencil,
                  onClick: () => {
                    setViewSheet((s) => ({ ...s, open: false }));
                    setDialog({ open: true, editing: viewSheet.row });
                  },
                },
              ]
            : []
        }
        fields={
          viewSheet.row
            ? [
                { label: t.section_service ?? "Service", type: "section" },
                { label: t.col_service ?? "Service", value: viewSheet.row.service_display },
                { label: t.field_service_code ?? "Service Code", type: "code", value: viewSheet.row.service },
                {
                  label: t.col_api_url ?? "API URL",
                  type: "code",
                  value: viewSheet.row.api_url || null,
                },
                { label: t.section_status ?? "Status", type: "section" },
                {
                  label: t.col_status ?? "Status",
                  type: "status",
                  active: viewSheet.row.is_active,
                  activeLabel: tCommon.badge_active ?? "Active",
                  inactiveLabel: tCommon.badge_inactive ?? "Inactive",
                },
                { label: t.field_created ?? "Created", type: "date", value: viewSheet.row.created_at },
                { label: t.field_updated ?? "Last Updated", type: "date", value: viewSheet.row.updated_at },
              ]
            : []
        }
      />
    </div>
  );
}
