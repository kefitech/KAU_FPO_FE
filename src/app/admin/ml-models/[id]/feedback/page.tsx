"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { adminMlModelsApi } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { getFeedbackColumns } from "./_components/columns";

export default function ModelFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = Number(params.id);

  const { data: models } = useQuery({
    queryKey: ["ml-models-all"],
    queryFn: () => adminMlModelsApi.getAll({ page: 1, page_size: 100 }),
  });
  const model = models?.data.find((m) => m.id === modelId);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/ml-models")} className="mb-2 -ml-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to model versions
        </Button>
        <h1 className="font-bold text-2xl">Feedback{model ? `: ${model.version_code}` : ""}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Farmer ratings and comments on recommendations produced by this model version.
        </p>
      </div>

      <Suspense>
        <DataTable
          queryKey={`ml-model-feedback-${modelId}`}
          queryFn={(dtParams) => adminMlModelsApi.getFeedback(modelId, dtParams)}
          columns={getFeedbackColumns()}
          columnsLabel="Columns"
          toggleColumnsLabel="Toggle columns"
          searchPlaceholder="Search..."
          clearLabel="Clear"
        />
      </Suspense>
    </div>
  );
}