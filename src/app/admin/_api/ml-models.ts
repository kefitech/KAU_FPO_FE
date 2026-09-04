import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

// Lifecycle of a version. Anything registered by direct file upload is
// `ready` from the start; a version created via Train from CSV starts as
// `training` and is flipped by the Celery task to `ready` or `failed`.
export type MLModelStatus = "training" | "ready" | "failed";

export interface MLModelVersion {
  id: number;
  version_code: string;
  description: string;
  is_active: boolean;
  deployed_at: string;
  model_file_path: string;
  // Null for versions registered via direct file upload (MLModelVersionAdminView)
  // and while a CSV retrain is still running.
  training_metrics: TrainingMetrics | null;
  status: MLModelStatus;
  // Why training failed; empty unless status is "failed".
  training_error: string;
}

export interface RecommendationFeedbackItem {
  id: number;
  fpo_name: string;
  financial_year: string;
  feedback_rating: number;
  feedback_comment: string;
  crops: string[];
  created_at: string;
}

// Shape of the metrics FastAPI's /train/ endpoint returns (see
// ml_service/retrain_pipeline.py's _train()). Surfaced as-is so the admin
// can judge a retrained model's quality before deciding to activate it --
// there is currently no automatic accuracy threshold that blocks
// registration (see django_patch/README_wiring.md).
export interface ZoneCrossValidation {
  held_out_zone: string;
  accuracy: number;
  f1: number;
  n_test: number;
}

export interface TrainingMetrics {
  random_80_20_split: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    confusion_matrix: number[][];
    n_train: number;
    n_test: number;
  };
  leave_one_zone_out_cv: ZoneCrossValidation[];
  feature_importance_by_field: Record<string, number>;
  n_rows_total: number;
  n_crops: number;
  crops_with_no_positive_label: number;
  class_balance: Record<string, number>;
  caveat: string;
  validation_warnings: string[];
}

type Wrapped<T> = { status: string; message: string; data: T; warning?: string };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/admin/ml-models/";
const FEEDBACK_BASE = "/admin/recommendations/feedback/";

export const adminMlModelsApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<MLModelVersion>>(BASE, { params }).then((r) => r.data),

  // The uploaded model file is validated by the ML service (POST
  // /validate-model/) before Django saves or registers it -- a file whose
  // input columns don't match the service's feature schema is rejected with a
  // 422 whose message names the mismatch. On success, `validation_warnings`
  // carries non-blocking notes (e.g. scikit-learn version mismatch).
  create: (formData: FormData): Promise<MLModelVersion & { validation_warnings?: string[] }> =>
    api
      .post<Wrapped<MLModelVersion & { validation_warnings?: string[] }>>(BASE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000, // validation round-trips the file to the ML service and loads it
      })
      .then(unwrap),

  // Returns a `warning` field too — set if activation succeeded in Django
  // but notifying the FastAPI service failed (graceful degradation, see
  // apps/recommendations/api/recommendations.py MLModelVersionActivateView)
  activate: (id: number): Promise<MLModelVersion & { warning?: string }> =>
    api.post<Wrapped<MLModelVersion>>(`${BASE}${id}/activate/`).then((r) => ({
      ...r.data.data,
      warning: r.data.warning,
    })),

  /**
   * Feedback on recommendations produced by a specific model version.
   * Matches GET /api/admin/recommendations/feedback/?model_version=<id>
   * (apps/recommendations/api/recommendations.py RecommendationFeedbackAdminViewSet).
   * modelVersionId is merged into the DataTable's own params (page,
   * page_size, search, etc.) at the call site — the DataTable component
   * itself doesn't need to know about model_version.
   */
  getFeedback: (modelVersionId: number, params: DataTableParams) =>
    api
      .get<PaginatedResponse<RecommendationFeedbackItem>>(FEEDBACK_BASE, {
        params: { ...params, model_version: modelVersionId },
      })
      .then((r) => r.data),

  /**
   * Uploads a CSV to POST /api/admin/ml-models/retrain/ (MLModelRetrainView).
   * Returns 202 almost immediately with the new version row in
   * status "training": Django pre-checks the file, has the ML service
   * validate its structure (milliseconds -- a missing column is a 422 here),
   * saves it, creates the row and dispatches a Celery task. Training itself
   * happens in that task; poll the list until the row is "ready" or "failed".
   * `validation_warnings` carries non-blocking findings (unknown zone values,
   * tiny file) worth showing right away.
   */
  retrain: (formData: FormData): Promise<MLModelVersion & { validation_warnings?: string[] }> =>
    api
      .post<Wrapped<MLModelVersion & { validation_warnings?: string[] }>>(`${BASE}retrain/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      })
      .then(unwrap),
};
