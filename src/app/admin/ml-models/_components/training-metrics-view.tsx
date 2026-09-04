"use client";

import type { TrainingMetrics } from "@/app/admin/_api/ml-models";
import { Badge } from "@/components/ui/badge";

// Below this leave-one-zone-out accuracy, flag the zone as a weak spot in
// the readout -- this is a display threshold only, not an enforced gate.
// See django_patch/README_wiring.md: "nothing currently blocks registering
// (or even activating) a materially worse model" -- that's still a human
// decision, this just makes the number harder to miss.
const WEAK_ZONE_THRESHOLD = 0.65;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Shared training-metrics readout. Used in two places:
 *  - train/page.tsx, right after a CSV upload finishes training
 *  - _components/columns.tsx, in a "View Training Stats" dialog for any
 *    already-registered version that has training_metrics saved (i.e. it
 *    came from the CSV retrain flow, not a direct file upload)
 * Keeping this as one component means both places always show the same
 * numbers in the same shape -- no risk of the two views drifting apart.
 */
export function TrainingMetricsView({ metrics, warnings = [] }: { metrics: TrainingMetrics; warnings?: string[] }) {
  const split = metrics.random_80_20_split;
  const topFeatures = Object.entries(metrics.feature_importance_by_field)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const weakZones = metrics.leave_one_zone_out_cv.filter((z) => z.accuracy < WEAK_ZONE_THRESHOLD);
  // The /train/ response carries validation_warnings both at the top level and
  // nested inside metrics (same list) -- de-duplicate so each shows once.
  const allWarnings = Array.from(new Set([...warnings, ...(metrics.validation_warnings ?? [])]));

  return (
    <div className="flex flex-col gap-5">
      {allWarnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="font-medium text-amber-800 dark:text-amber-400">
            Dataset warnings (training still completed)
          </span>
          <ul className="list-inside list-disc text-amber-800/90 dark:text-amber-400/90">
            {allWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div>
          <p className="text-muted-foreground text-xs">Accuracy</p>
          <p className="font-semibold text-lg">{pct(split.accuracy)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Precision</p>
          <p className="font-semibold text-lg">{pct(split.precision)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Recall</p>
          <p className="font-semibold text-lg">{pct(split.recall)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">F1</p>
          <p className="font-semibold text-lg">{pct(split.f1)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">ROC-AUC</p>
          <p className="font-semibold text-lg">{split.roc_auc.toFixed(3)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Rows used</p>
          <p className="font-medium">{metrics.n_rows_total.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Crops</p>
          <p className="font-medium">{metrics.n_crops}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Crops with no positive label</p>
          <p className="font-medium">{metrics.crops_with_no_positive_label}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Class balance (suitable)</p>
          <p className="font-medium">{pct(metrics.class_balance["1"] ?? 0)}</p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-muted-foreground text-xs">Top feature importance</p>
        <div className="flex flex-col gap-1">
          {topFeatures.map(([field, value]) => (
            <div key={field} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate text-muted-foreground">{field}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: pct(value) }} />
              </div>
              <span className="w-12 text-right font-medium">{pct(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-muted-foreground text-xs">
          Leave-one-zone-out cross-validation (generalization to a zone the model never trained on)
        </p>
        <div className="flex flex-wrap gap-2">
          {metrics.leave_one_zone_out_cv.map((z) => (
            <Badge
              key={z.held_out_zone}
              variant="secondary"
              className={
                z.accuracy < WEAK_ZONE_THRESHOLD
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
              }
            >
              {z.held_out_zone}: {pct(z.accuracy)}
            </Badge>
          ))}
        </div>
        {weakZones.length > 0 && (
          <p className="mt-1.5 text-red-700 text-xs dark:text-red-400">
            {weakZones.map((z) => z.held_out_zone).join(", ")} generalize{weakZones.length === 1 ? "s" : ""} noticeably
            worse than the others — worth a look before activating for those zones.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs italic">{metrics.caveat}</p>
    </div>
  );
}
