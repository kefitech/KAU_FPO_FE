"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { adminMlModelsApi, type RecommendationFeedbackItem } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { getFeedbackColumns, StarDisplay } from "./_components/columns";

export default function ModelFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = Number(params.id);
  const [feedbackView, setFeedbackView] = useState<{ open: boolean; row: RecommendationFeedbackItem | null }>({
    open: false,
    row: null,
  });

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
          onRowClick={(row) => setFeedbackView({ open: true, row })}
          columnsLabel="Columns"
          toggleColumnsLabel="Toggle columns"
          searchPlaceholder="Search..."
          clearLabel="Clear"
        />
      </Suspense>

      <ViewSheet
        open={feedbackView.open}
        onOpenChange={(open) => setFeedbackView((s) => ({ ...s, open }))}
        title="Feedback Details"
        fields={
          feedbackView.row
            ? [
                { label: "FPO", value: feedbackView.row.fpo_name },
                { label: "Financial Year", value: feedbackView.row.financial_year },
                { label: "Rating", type: "node", node: <StarDisplay rating={feedbackView.row.feedback_rating} /> },
                { label: "Comment", value: feedbackView.row.feedback_comment || "No comment" },
                { label: "Crops Recommended", type: "tags", tags: feedbackView.row.crops.slice(0, 10) },
                { label: "Date", type: "date", value: feedbackView.row.created_at },
              ]
            : []
        }
      />
    </div>
  );
}