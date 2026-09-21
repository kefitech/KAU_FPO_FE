"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { type CropPackageOfPractices, adminCropPackageOfPracticesApi } from "@/app/admin/_api/crop-package-of-practices";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet, type SheetField } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

import { getCropPackageOfPracticesColumns } from "./_components/columns";

type T = Record<string, string>;

function buildViewFields(item: CropPackageOfPractices, t: T, tCommon: T): SheetField[] {
  const fields: SheetField[] = [
    { type: "section", label: t.section_details ?? "Details" },
    { label: t.field_crop_group ?? "Crop Group", value: item.crop_group || "—" },
    {
      label: t.field_status ?? "Status",
      type: "status",
      active: item.is_active,
      activeLabel: tCommon.badge_active ?? "Active",
      inactiveLabel: tCommon.badge_inactive ?? "Inactive",
    },
    { label: t.field_season ?? "Season", value: item.season || "—" },
  ];

  if (item.varieties?.length) {
    fields.push({ type: "section", label: t.section_varieties ?? "Varieties" });
    fields.push({
      label: t.field_varieties ?? "Varieties",
      type: "node",
      node: (
        <ul className="space-y-2">
          {item.varieties.map((v, i) => (
            <li key={i}>
              <span className="font-medium">{v.name}</span>
              {v.description && <span className="text-muted-foreground"> — {v.description}</span>}
            </li>
          ))}
        </ul>
      ),
    });
  }

  fields.push({ type: "section", label: t.section_cultivation ?? "Cultivation Details" });
  fields.push({
    label: t.field_spacing ?? "Spacing",
    type: "node",
    node: <div className="whitespace-pre-wrap">{item.spacing || "—"}</div>,
  });
  fields.push({
    label: t.field_manuring_fertilizer ?? "Manuring & Fertilizer",
    type: "node",
    node: <div className="whitespace-pre-wrap">{item.manuring_fertilizer || "—"}</div>,
  });
  fields.push({
    label: t.field_plant_protection ?? "Plant Protection",
    type: "node",
    node: <div className="whitespace-pre-wrap">{item.plant_protection || "—"}</div>,
  });
  fields.push({
    label: t.field_harvesting ?? "Harvesting",
    type: "node",
    node: <div className="whitespace-pre-wrap">{item.harvesting || "—"}</div>,
  });
  fields.push({ label: t.field_expected_yield ?? "Expected Yield", value: item.expected_yield || "—" });

  if (item.sections?.length) {
    fields.push({ type: "section", label: t.section_additional ?? "Additional Sections" });
    for (const s of item.sections) {
      fields.push({
        label: s.heading,
        type: "node",
        node: <div className="whitespace-pre-wrap">{s.body}</div>,
      });
    }
  }

  fields.push({ type: "section", label: t.section_source ?? "Source" });
  fields.push({ label: t.field_source_reference ?? "Source Reference", value: item.source_reference || "—" });
  fields.push({ label: t.field_source_page_range ?? "Source Page Range", value: item.source_page_range || "—" });
  fields.push({ label: t.field_updated ?? "Last updated", type: "date", value: item.updated_at });

  return fields;
}

export default function CropPackageOfPracticesPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; item: CropPackageOfPractices | null }>({ open: false, item: null });
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_crop_package_of_practices,common")
      .then((data) => {
        setT(data.admin_crop_package_of_practices ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCropPackageOfPracticesApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Crop entry deleted");
      queryClient.invalidateQueries({ queryKey: ["crop-package-of-practices"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (item: CropPackageOfPractices) =>
      item.is_active ? adminCropPackageOfPracticesApi.deactivate(item.id) : adminCropPackageOfPracticesApi.activate(item.id),
    onSuccess: () => {
      toast.success(t.toast_status_updated ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["crop-package-of-practices"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to update status"),
  });

  const columns = getCropPackageOfPracticesColumns({
    t,
    tCommon,
    onEdit: (item) => router.push(`/admin/ai-recommendation/crop-package-of-practices/${item.id}/edit`),
    onDelete: (item) =>
      confirm({
        title: t.delete_title ?? "Delete crop entry",
        description: t.delete_description ?? "Are you sure you want to delete this crop's Package of Practices entry?",
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      }),
    onToggleStatus: (item) => toggleStatusMutation.mutate(item),
  });

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Crop Package of Practices"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ??
              "Cultivation guidance shown to FPOs when they tap a recommended crop — transcribed from KAU's Package of Practices book. Only Active entries are visible to FPOs."}
          </p>
        </div>
        <Button
          className="self-start sm:self-auto bg-blue-700 hover:bg-blue-600"
          onClick={() => router.push("/admin/ai-recommendation/crop-package-of-practices/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add Crop Entry"}
        </Button>
      </div>

      <DataTable
        queryKey="crop-package-of-practices"
        queryFn={adminCropPackageOfPracticesApi.getAll}
        columns={columns}
        onRowClick={(row) => setSheet({ open: true, item: row })}
        columnsLabel={tCommon.col_header ?? "Columns"}
        toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
        searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
        clearLabel={tCommon.cancel ?? "Clear"}
      />

      {sheet.item && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={sheet.item.crop_name}
          actions={[
            {
              label: t.action_edit ?? "Edit",
              icon: Pencil,
              onClick: () => {
                setSheet((prev) => ({ ...prev, open: false }));
                router.push(`/admin/ai-recommendation/crop-package-of-practices/${sheet.item!.id}/edit`);
              },
            },
          ]}
          fields={buildViewFields(sheet.item, t, tCommon)}
        />
      )}
    </div>
  );
}
