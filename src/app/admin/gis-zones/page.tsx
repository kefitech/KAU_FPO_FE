"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { adminGisZonesApi, type ZoneVersion } from "@/app/admin/_api/gis-zones";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { getZoneVersionColumns } from "./_components/columns";

type T = Record<string, string>;

const ZonesMap = dynamic(
  () => import("./_components/zones-map").then((m) => ({ default: m.ZonesMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    ),
  },
);

export default function GisZonesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locale = useLocaleStore((s) => s.locale);

  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_gis_zones")
      .then((data) => setT(data.admin_gis_zones ?? {}))
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const [previewVersionId, setPreviewVersionId] = useState<number | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>("");

  const { data: liveZones, isLoading: mapLoading } = useQuery({
    queryKey: ["gis-zones-map"],
    queryFn: adminGisZonesApi.getLiveZones,
  });

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ["gis-zone-version-preview", previewVersionId],
    queryFn: () => adminGisZonesApi.getVersionDetail(previewVersionId as number),
    enabled: previewVersionId !== null,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("geojson_file", file);
      return adminGisZonesApi.upload(formData);
    },
    onSuccess: (version) => {
      toast.success((t.toast_uploaded ?? 'Uploaded "{label}" — not yet live.').replace("{label}", version.label));
      queryClient.invalidateQueries({ queryKey: ["gis-zone-versions"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? t.toast_upload_failed ?? "Failed to upload zone boundaries");
    },
  });

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  function handleRowClick(version: ZoneVersion) {
    setPreviewVersionId(version.id);
    setPreviewLabel(version.label);
  }

  function handleClearPreview() {
    setPreviewVersionId(null);
    setPreviewLabel("");
  }

  const isPreviewing = previewVersionId !== null;
  const mapData = isPreviewing ? previewData?.geojson_data : liveZones;
  const mapIsLoading = isPreviewing ? previewLoading : mapLoading;

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Agro-Climatic Zone Boundaries"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? 'Click a row below to preview it on the map — this does NOT make it live. Only "Activate" does that.'}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson,application/geo+json,application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            {t.btn_upload ?? "Upload new version"}
          </Button>
        </div>
      </div>

      {isPreviewing ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Eye className="h-4 w-4" />
            <span>
              {(t.preview_banner ?? "Previewing {label} — not live, farmers still see the current active zones.").replace(
                "{label}",
                previewLabel,
              )}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClearPreview}>
            <X className="mr-1 h-3.5 w-3.5" />
            {t.btn_back_to_live ?? "Back to live view"}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-4 py-2.5 text-muted-foreground text-sm">
          {t.live_banner ?? "Showing the currently LIVE zones — what every farmer sees right now."}
        </div>
      )}

      {mapIsLoading ? (
        <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
      ) : mapData ? (
        <ZonesMap zones={mapData} mapKey={isPreviewing ? `preview-${previewVersionId}` : "live"} t={t} />
      ) : null}

      <div>
        <h2 className="font-semibold text-lg">{t.versions_heading ?? "Uploaded Versions"}</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.versions_description ?? "Click a row to preview it above. Use the ⋯ menu to Activate or Delete."}
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey="gis-zone-versions"
          queryFn={adminGisZonesApi.getVersions}
          columns={getZoneVersionColumns(t)}
          columnsLabel="Columns"
          toggleColumnsLabel="Toggle columns"
          searchPlaceholder="Search..."
          clearLabel="Clear"
          onRowClick={handleRowClick}
        />
      </Suspense>
    </div>
  );
}