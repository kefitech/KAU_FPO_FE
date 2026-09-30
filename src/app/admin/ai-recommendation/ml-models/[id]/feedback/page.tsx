"use client";

import { useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminMlModelsApi } from "@/app/admin/_api/ml-models";
import { Button } from "@/components/ui/button";

import { FeedbackList } from "./_components/feedback-list";

export default function ModelFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = Number(params.id);

  const { data: models } = useQuery({
    queryKey: ["ml-models-all"],
    queryFn: () => adminMlModelsApi.getAll({ page: 1, page_size: 100 }),
  });
  const model = models?.data.find((m) => m.id === modelId);

  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      await adminMlModelsApi.exportFeedback(modelId);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/ai-recommendation/ml-models")}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to model versions
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl">Feedback{model ? `: ${model.version_code}` : ""}</h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Farmer ratings and comments on recommendations produced by this model version.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="self-start">
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Export to Excel
          </Button>
        </div>
      </div>

      <FeedbackList modelVersionId={modelId} />
    </div>
  );
}
