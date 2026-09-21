"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Plus } from "lucide-react";

import {
  MASTER_CATEGORIES,
  type MasterCategory,
  type MasterDataEntry,
  masterDataAdminApi,
  masterDataQueryKey,
} from "@/app/admin/_api/master-data";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { DataTableParams } from "@/types/pagination";

import { getMasterDataColumns } from "./_components/columns";
import { MasterDataDialog } from "./_components/master-data-dialog";

type T = Record<string, string>;

function MasterDataContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [dialog, setDialog] = useState<{ open: boolean; editing: MasterDataEntry | null }>({
    open: false,
    editing: null,
  });

  const categoryParam = searchParams.get("category");
  const category: MasterCategory =
    MASTER_CATEGORIES.find((c) => c.value === categoryParam)?.value ?? MASTER_CATEGORIES[0].value;

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_master_data,common")
      .then((data) => {
        setT(data.admin_master_data ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const categories = MASTER_CATEGORIES.map((c) => ({ ...c, label: t[`category_${c.value}`] ?? c.label }));
  const categoryLabel = categories.find((c) => c.value === category)?.label ?? "";

  // Switching tables starts fresh: only the category stays in the URL (page, search and filters are dropped)
  function changeCategory(value: string) {
    router.replace(`${pathname}?category=${value}`);
  }

  const filters = useMemo(
    () => [
      {
        key: "is_active",
        label: t.col_status ?? "Status",
        options: [
          { label: t.status_active ?? "Active", value: "true" },
          { label: t.status_inactive ?? "Inactive", value: "false" },
        ],
      },
    ],
    [t],
  );

  const columns = useMemo(
    () => getMasterDataColumns(category, t, locale, (entry) => setDialog({ open: true, editing: entry })),
    [category, t, locale],
  );

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Master Data"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage the dropdown options used across the platform"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <NativeSelect
            aria-label={t.select_label ?? "Master data table"}
            value={category}
            onChange={(e) => changeCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
          <Button size="sm" onClick={() => setDialog({ open: true, editing: null })}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_add ?? "Add"}
          </Button>
        </div>
      </div>

      <DataTable
        key={category}
        queryKey={masterDataQueryKey(category)}
        queryFn={(params: DataTableParams) => masterDataAdminApi.getAll(category, params)}
        columns={columns}
        filters={filters}
        columnsLabel={tCommon.col_header ?? "Columns"}
        toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
        searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
        clearLabel={tCommon.cancel ?? "Clear"}
      />

      <MasterDataDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        category={category}
        categoryLabel={categoryLabel}
        editing={dialog.editing}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense>
      <MasterDataContent />
    </Suspense>
  );
}
