"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { Pencil, Plus } from "lucide-react";

import { externalApisApi } from "@/app/admin/_api/external-apis";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { ExternalApi } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

import { ExternalApiDialog } from "./_components/external-api-dialog";
import { getExternalApiColumns } from "./_components/columns";

type T = Record<string, string>;

export default function ExternalApisPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [dialog, setDialog] = useState<{ open: boolean; editing: ExternalApi | null }>({
    open: false,
    editing: null,
  });
  const [sheet, setSheet] = useState<{ open: boolean; item: ExternalApi | null }>({
    open: false,
    item: null,
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

  const queryFn = useCallback(
    async (_params: DataTableParams): Promise<PaginatedResponse<ExternalApi>> => {
      const data = await externalApisApi.getAll();
      const list = Array.isArray(data) ? data : [];
      return {
        status: "success",
        message: "",
        data: list,
        meta: {
          pagination: {
            page: 1,
            page_size: list.length || 10,
            total_count: list.length,
            total_pages: 1,
            has_next: false,
            has_previous: false,
          },
        },
      };
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "External APIs"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage third-party service integrations for verification and data lookup"}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.add_button ?? "Add External API"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="external-apis"
          queryFn={queryFn}
          columns={getExternalApiColumns(t, tCommon, (item) => setDialog({ open: true, editing: item }))}
          onRowClick={(row) => setSheet({ open: true, item: row })}
        />
      </Suspense>

      <ExternalApiDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        editing={dialog.editing}
        t={t}
        tCommon={tCommon}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.service_display}
          actions={[
            {
              label: t.edit_button ?? "Edit",
              icon: Pencil,
              onClick: () => {
                setSheet((prev) => ({ ...prev, open: false }));
                setDialog({ open: true, editing: sheet.item });
              },
            },
          ]}
          fields={[
            { label: "Service", value: sheet.item.service_display },
            { label: "API URL", type: "code", value: sheet.item.api_url },
            { label: "Status", type: "status", active: sheet.item.is_active, activeLabel: tCommon.badge_active ?? "Active", inactiveLabel: tCommon.badge_inactive ?? "Inactive" },
            { label: "Created", type: "date", value: sheet.item.created_at },
            { label: "Last Updated", type: "date", value: sheet.item.updated_at },
          ]}
        />
      )}
    </div>
  );
}
