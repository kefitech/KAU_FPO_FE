"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { adminMlModelsApi, type MLModelVersion } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { PaginatedResponse } from "@/types/pagination";

import { getMlModelColumns } from "./_components/columns";
import { TrainingMetricsView } from "./_components/training-metrics-view";

const TRAINING_POLL_MS = 5_000;

type T = Record<string, string>;

export default function MlModelsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [detail, setDetail] = useState<{ open: boolean; model: MLModelVersion | null }>({
    open: false,
    model: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "ml_models_table,common")
      .then((data) => {
        setT(data.ml_models_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  // Lightweight status watch, separate from the DataTable's own paginated
  // query: polls while any version is training, stops when none is, and
  // nudges the table to refetch whenever a status actually changes. Same
  // "fetch first 100" shape the feedback page already uses for its lookup.
  const { data: statusData } = useQuery({
    queryKey: ["ml-models-status"],
    queryFn: () => adminMlModelsApi.getAll({ page: 1, page_size: 100 }),
    // Read the latest data from the cache rather than from the callback
    // argument -- its shape differs between TanStack Query v4 and v5, this
    // works identically in both.
    refetchInterval: () => {
      const latest = queryClient.getQueryData<PaginatedResponse<MLModelVersion>>(["ml-models-status"]);
      return latest?.data.some((m) => m.status === "training") ? TRAINING_POLL_MS : false;
    },
  });
  const trainingCount = statusData?.data.filter((m) => m.status === "training").length ?? 0;
  const statusSignature = useMemo(
    () => (statusData?.data ?? []).map((m) => `${m.id}:${m.status}`).join(","),
    [statusData],
  );
  const lastSignature = useRef(statusSignature);
  useEffect(() => {
    if (statusSignature !== lastSignature.current) {
      lastSignature.current = statusSignature;
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
    }
  }, [statusSignature, queryClient]);

  function openDetails(model: MLModelVersion) {
    if (model.status === "training") {
      toast.info(t.toast_still_training ?? "Still training — stats will be available when it finishes.");
      return;
    }
    if (model.status === "ready" && !model.training_metrics) {
      // Rows are clickable table-wide (DataTable's onRowClick doesn't vary
      // per-row), so a version with nothing to show -- registered via direct
      // file upload -- needs an explicit signal rather than a dead click.
      toast.info(t.toast_no_training_stats ?? "No training stats for this version (registered via file upload).");
      return;
    }
    setDetail({ open: true, model });
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "ML Model Versions"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ??
              "Manage crop recommendation model versions. Only one version can be active at a time."}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button size="sm" variant="outline" onClick={() => router.push("/admin/ml-models/train")}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {t.btn_train ?? "Train from CSV"}
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/ml-models/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.btn_register ?? "Register Model"}
          </Button>
        </div>
      </div>

      {trainingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 text-sm dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          {trainingCount === 1
            ? (t.training_banner_singular ?? "1 version is training")
            : (t.training_banner_plural ?? "{n} versions are training").replace("{n}", String(trainingCount))}{" "}
          {t.training_banner_suffix ?? "— this list refreshes automatically."}
        </div>
      )}

      <Suspense>
        <DataTable
          queryKey="ml-models"
          queryFn={adminMlModelsApi.getAll}
          columns={getMlModelColumns(openDetails, t, tCommon)}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
          clearLabel={tCommon.cancel ?? "Clear"}
          onRowClick={(row) => openDetails(row)}
        />
      </Suspense>

      <Dialog open={detail.open} onOpenChange={(open) => setDetail((s) => ({ ...s, open }))}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail.model?.status === "failed"
                ? (t.dialog_title_failed ?? "Training failed")
                : (t.dialog_title_stats ?? "Training stats")}{" "}
              — <span className="font-mono">{detail.model?.version_code}</span>
            </DialogTitle>
          </DialogHeader>
          {detail.model?.status === "failed" ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                {t.failed_help ??
                  "This version has no model file and cannot be activated. Fix the cause below and upload the dataset again as a new version."}
              </p>
              <pre className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 font-mono text-red-800 text-xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {detail.model.training_error || (t.no_error_details ?? "No error details were recorded.")}
              </pre>
            </div>
          ) : (
            detail.model?.training_metrics && <TrainingMetricsView metrics={detail.model.training_metrics} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
