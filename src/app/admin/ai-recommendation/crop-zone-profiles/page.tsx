"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { KAU_ZONES, type CropZoneProfile, adminCropZoneProfilesApi } from "@/app/admin/_api/crop-zone-profiles";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { masterDataApi } from "@/lib/api/master-data";
import { translationsApi } from "@/lib/api/translations";
import { useConfirmStore } from "@/stores/confirm-store";
import { useLocaleStore } from "@/stores/locale-store";

import { getCropZoneProfileColumns } from "./_components/columns";

type T = Record<string, string>;

export default function CropZoneProfilesPage() {
  const router = useRouter();
  const confirm = useConfirmStore((s) => s.confirm);
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; item: CropZoneProfile | null }>({ open: false, item: null });
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_crop_zone_profiles,common")
      .then((data) => {
        setT(data.admin_crop_zone_profiles ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCropZoneProfilesApi.delete(id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Crop zone profile deleted");
      queryClient.invalidateQueries({ queryKey: ["crop-zone-profiles"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (item: CropZoneProfile) =>
      item.is_active ? adminCropZoneProfilesApi.deactivate(item.id) : adminCropZoneProfilesApi.activate(item.id),
    onSuccess: () => {
      toast.success(t.toast_status_updated ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["crop-zone-profiles"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to update status"),
  });

  const columns = getCropZoneProfileColumns({
    t,
    tCommon,
    onEdit: (item) => router.push(`/admin/ai-recommendation/crop-zone-profiles/${item.id}/edit`),
    onDelete: (item) =>
      confirm({
        title: t.delete_title ?? "Delete crop zone profile",
        description:
          t.delete_description ?? "Are you sure you want to delete this profile? This won't affect a crop's other zone profiles.",
        onConfirm: () => deleteMutation.mutateAsync(item.id),
      }),
    onToggleStatus: (item) => toggleStatusMutation.mutate(item),
  });

  const { data: groupOptions } = useQuery({
    queryKey: ["master-data-select", "crop_group"],
    queryFn: () => masterDataApi.get("crop_group", undefined, "en"),
    staleTime: 5 * 60_000,
  });

  const filters = [
    {
      key: "kau_zone",
      label: t.field_kau_zone ?? "KAU Zone",
      type: "select" as const,
      options: KAU_ZONES.map((z) => ({ label: z, value: z })),
    },
    {
      key: "crop_group",
      label: t.field_crop_group ?? "Crop Group",
      type: "select" as const,
      options: (groupOptions ?? []).map((g) => ({ label: g.name, value: g.name })),
    },
  ];

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
          <h1 className="font-bold text-2xl">{t.page_title ?? "Crop Zone Profiles"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t.page_description ??
              "The AI recommendation service's live knowledge base — which crops are eligible per zone, and their documented temperature/pH/season requirements. Only Active profiles affect recommendations."}
          </p>
        </div>
        <Button
          className="self-start sm:self-auto bg-blue-700 hover:bg-blue-600"
          onClick={() => router.push("/admin/ai-recommendation/crop-zone-profiles/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.btn_add ?? "Add Profile"}
        </Button>
      </div>

      <DataTable
        queryKey="crop-zone-profiles"
        queryFn={adminCropZoneProfilesApi.getAll}
        columns={columns}
        filters={filters}
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
                router.push(`/admin/ai-recommendation/crop-zone-profiles/${sheet.item!.id}/edit`);
              },
            },
          ]}
          fields={[
            { type: "section", label: t.section_details ?? "Details" },
            {
              label: t.field_kau_zone ?? "KAU Zone",
              type: "node",
              node: (
                <Badge variant="secondary" className="text-xs font-medium">
                  {sheet.item.kau_zone}
                </Badge>
              ),
            },
            { label: t.field_crop_group ?? "Crop Group", value: sheet.item.crop_group || "—" },
            {
              label: t.field_status ?? "Status",
              type: "status",
              active: sheet.item.is_active,
              activeLabel: tCommon.badge_active ?? "Active",
              inactiveLabel: tCommon.badge_inactive ?? "Inactive",
            },
            { type: "section", label: t.section_requirements ?? "Documented Requirements" },
            { label: t.field_temp_range ?? "Temperature range (°C)", value: `${sheet.item.temp_lo}–${sheet.item.temp_hi}` },
            { label: t.field_ph_range ?? "Soil pH range", value: `${sheet.item.ph_lo}–${sheet.item.ph_hi}` },
            { label: t.field_seasons_text ?? "Season / planting window", value: sheet.item.seasons_text || "—" },
            {
              label: t.field_temp_is_real ?? "Temperature from book",
              value: sheet.item.temp_is_real ? (t.yes ?? "Yes") : (t.no_fallback ?? "No — fallback estimate"),
            },
            {
              label: t.field_ph_is_real ?? "pH from book",
              value: sheet.item.ph_is_real ? (t.yes ?? "Yes") : (t.no_fallback ?? "No — fallback estimate"),
            },
            { label: t.field_updated ?? "Last updated", type: "date", value: sheet.item.updated_at },
          ]}
        />
      )}
    </div>
  );
}
