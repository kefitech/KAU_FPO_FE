"use client";

import { Suspense, useState } from "react";

import dynamic from "next/dynamic";

import { adminMlModelsApi, type RecommendationFeedbackItem } from "@/app/admin/_api/ml-models";
import { DataTable } from "@/components/data-table";
import { ViewSheet } from "@/components/ui/view-sheet";

import { getFeedbackColumns, StarDisplay } from "./columns";

const RecommendationLocationMap = dynamic(
  () => import("@/components/gis/recommendation-location-map").then((m) => ({ default: m.RecommendationLocationMap })),
  { ssr: false },
);

function FarmBoundary({ location }: { location: RecommendationFeedbackItem["location_snapshot"] }) {
  if (!location || (!location.area_polygon && location.lat == null)) {
    return <span className="text-muted-foreground">No farm boundary recorded</span>;
  }
  return (
    <div className="space-y-1.5">
      <RecommendationLocationMap lat={location.lat} lng={location.lng} areaPolygon={location.area_polygon} />
      {location.address && <p className="text-muted-foreground text-xs">{location.address}</p>}
      {!location.area_polygon && (
        <p className="text-muted-foreground text-xs">No boundary drawn — showing the farm location only.</p>
      )}
    </div>
  );
}

/**
 * Every feedback submission on one model version's recommendations (one row
 * each). Clicking a row shows the full entry, including the farm boundary the
 * rated recommendation was generated for.
 */
export function FeedbackList({ modelVersionId }: { modelVersionId: number }) {
  const [feedbackView, setFeedbackView] = useState<{ open: boolean; row: RecommendationFeedbackItem | null }>({
    open: false,
    row: null,
  });
  const row = feedbackView.row;

  return (
    <>
      <Suspense>
        <DataTable
          queryKey={`ml-model-feedback-${modelVersionId}`}
          queryFn={(dtParams) => adminMlModelsApi.getFeedback(modelVersionId, dtParams)}
          columns={getFeedbackColumns()}
          onRowClick={(r) => setFeedbackView({ open: true, row: r })}
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
          row
            ? [
                { label: "FPO", value: row.fpo_name },
                { label: "Financial Year", value: row.financial_year },
                { label: "Rating", type: "node", node: <StarDisplay rating={row.feedback_rating} /> },
                { label: "Comment", value: row.feedback_comment || "No comment" },
                { label: "Crops Recommended", type: "tags", tags: row.crops.slice(0, 10) },
                { label: "Farm Boundary", type: "node", node: <FarmBoundary location={row.location_snapshot} /> },
                { label: "Submitted", value: new Date(row.created_at).toLocaleString() },
              ]
            : []
        }
      />
    </>
  );
}
