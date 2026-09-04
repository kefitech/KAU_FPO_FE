"use client";

import { Suspense, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { adminMlModelsApi, type MLModelVersion } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getMlModelColumns } from "./_components/columns";
import { TrainingMetricsView } from "./_components/training-metrics-view";

export default function MlModelsPage() {
  const router = useRouter();
  const [statsView, setStatsView] = useState<{ open: boolean; model: MLModelVersion | null }>({
    open: false,
    model: null,
  });

  function openStats(model: MLModelVersion) {
    if (!model.training_metrics) {
      // Rows are clickable table-wide (DataTable's onRowClick doesn't vary
      // per-row), so a version with no saved metrics -- anything registered
      // via direct file upload -- needs an explicit "nothing here" signal
      // rather than silently doing nothing on click.
      toast.info("No training stats saved for this version (registered via file upload).");
      return;
    }
    setStatsView({ open: true, model });
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">ML Model Versions</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Manage crop recommendation model versions. Only one version can be active at a time.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button size="sm" variant="outline" onClick={() => router.push("/admin/ml-models/train")}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Train from CSV
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/ml-models/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Register Model
          </Button>
        </div>
      </div>

      <Suspense>
        <DataTable
          queryKey="ml-models"
          queryFn={adminMlModelsApi.getAll}
          columns={getMlModelColumns(openStats)}
          columnsLabel="Columns"
          toggleColumnsLabel="Toggle columns"
          searchPlaceholder="Search..."
          clearLabel="Clear"
          onRowClick={(row) => openStats(row)}
        />
      </Suspense>

      <Dialog open={statsView.open} onOpenChange={(open) => setStatsView((s) => ({ ...s, open }))}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Training stats — <span className="font-mono">{statsView.model?.version_code}</span>
            </DialogTitle>
          </DialogHeader>
          {statsView.model?.training_metrics && <TrainingMetricsView metrics={statsView.model.training_metrics} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
