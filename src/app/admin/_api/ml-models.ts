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

export interface MLServiceStatus {
  reachable: boolean;
  // Version the service is actually predicting with; null when unreachable.
  served_version: string | null;
}

// Values the ML service accepts for a test prediction (GET test-options/).
export interface ModelTestOptions {
  zones: string[];
  seasons: string[];
  soil_types: { value: string; ph_lo: number; ph_hi: number }[];
  tiers: string[];
}

export interface ModelTestInput {
  agro_zone: string;
  season: string;
  soil_type: string; // "" = not specified: the zone's soil mix is averaged
  soil_ph: number | null; // null = use the soil type's typical pH
  commodities: string[];
  tier: string | null;
  // Replace the zone's seasonal averages for this test only (e.g. with the
  // current weather at a map location). null = use the seasonal average.
  temperature_override: number | null;
  humidity_override: number | null;
}

// What the map location resolves to (POST test-location/).
export interface ModelTestLocation {
  lat: number;
  lng: number;
  address: string | null;
  // Hectares of a drawn area (same calculation as an FPO cultivation area); null for a pin.
  area_hectares: number | null;
  zone: { code: string; name: string } | null; // null = outside the supported zones
  soil_region: { soil_type: string; name: string } | null;
  // The model's soil category for that region; null = no match (the zone's
  // soil mix is averaged, same as for an FPO) or the service was unreachable.
  soil_category: string | null;
  soil_category_checked: boolean;
  season: string;
  weather: {
    temperature_c: number;
    humidity_percent: number;
    rainfall_mm: number;
    description: string;
    season: string;
    is_simulated: boolean; // no weather API key / API failed: a seasonal estimate
  };
}

export type ModelTestLocationQuery = { lat: number; lng: number } | { polygon: GeoJSON.Polygon };

// Per-component breakdown of the rule-fit score (0-1 each). `estimated` marks
// crops whose documented pH AND temperature ranges are fallback values.
export interface CropFitBreakdown {
  fit: number;
  temperature: number;
  ph: number;
  season: number;
  soil: number;
  zone_documented: boolean;
  estimated: boolean;
}

export interface ModelTestRecommendation {
  crop: string;
  confidence: number; // 0-1, relative to the best candidate for these inputs
  reasoning: string;
  estimated_yield: string;
  business_guidance: string;
  // Only present on responses from the (retired) rule-fit scorer era.
  fit?: CropFitBreakdown | null;
}

export interface ModelTestResult {
  recommendations: ModelTestRecommendation[];
  model_version: string;
  // true when the tested version is the one currently serving FPOs;
  // false when its file was loaded just for this test.
  used_live_model: boolean;
  // What the model actually saw after the service resolved the inputs.
  resolved_inputs: {
    zone: string;
    season: string;
    soil_categories: string[];
    soil_ph_used: number[];
    climate: { temperature_avg_C: number; rainfall_mm: number; humidity_pct: number };
    climate_overridden: string[]; // which climate values came from the overrides
    matched_commodities: string[];
    unmatched_commodities: string[];
    n_candidates: number;
  };
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
//
// v4 (current) trains a multiclass crop-name classifier and reports
// `top_5_hit_rate` instead of precision/recall/roc_auc/confusion_matrix --
// those don't mean much here since many (zone, season, soil) rows have
// several genuinely valid crop labels (see retrain_pipeline.py's _train()
// docstring). The v2/v3-only fields stay optional so a version registered
// before this change still renders correctly.
export interface ZoneCrossValidation {
  held_out_zone: string;
  top_5_hit_rate?: number; // v4+
  accuracy?: number; // v2/v3 only (binary is_suitable classifier)
  f1?: number; // v2/v3 only
  n_test: number;
}

export interface TrainingMetrics {
  random_80_20_split: {
    accuracy: number;
    top_5_hit_rate?: number; // v4+
    n_classes?: number; // v4+
    precision?: number; // v2/v3 only
    recall?: number; // v2/v3 only
    f1?: number; // v2/v3 only
    roc_auc?: number; // v2/v3 only
    confusion_matrix?: number[][]; // v2/v3 only
    n_train: number;
    n_test: number;
  };
  leave_one_zone_out_cv: ZoneCrossValidation[];
  feature_importance_by_field: Record<string, number>;
  n_rows_total: number;
  n_crops: number;
  crops_with_no_positive_label: number;
  class_balance?: Record<string, number>; // v2/v3 only
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

  // Django asks the ML service to load the version first and only marks it
  // active once that succeeds (MLModelVersionActivateView). Rejects with the
  // service's reason (400) if the model can't be loaded, or a 503 if the
  // service is unreachable -- in both cases nothing changes.
  activate: (id: number): Promise<MLModelVersion> =>
    api.post<Wrapped<MLModelVersion>>(`${BASE}${id}/activate/`).then(unwrap),

  // Whether the ML service answers its /health right now (MLServiceStatusView).
  getServiceStatus: (): Promise<MLServiceStatus> =>
    api.get<Wrapped<MLServiceStatus>>(`${BASE}service-status/`).then(unwrap),

  // Dropdown values for the test form, straight from the ML service
  // (MLModelTestOptionsView). 503 while the service is down.
  getTestOptions: (): Promise<ModelTestOptions> =>
    api.get<Wrapped<ModelTestOptions>>(`${BASE}test-options/`).then(unwrap),

  // Runs a prediction with this version and hand-picked inputs
  // (MLModelTestView). Works for any ready version, active or not; the live
  // model is untouched and nothing is saved. A non-active version's file is
  // loaded for the request, hence the longer timeout.
  test: (id: number, input: ModelTestInput): Promise<ModelTestResult> =>
    api.post<Wrapped<ModelTestResult>>(`${BASE}${id}/test/`, input, { timeout: 90_000 }).then(unwrap),

  // Zone, soil, current weather and address for a dropped pin or drawn
  // polygon (its centroid), as the FPO flow would derive them (MLModelTestLocationView).
  lookupTestLocation: (query: ModelTestLocationQuery): Promise<ModelTestLocation> =>
    api.post<Wrapped<ModelTestLocation>>(`${BASE}test-location/`, query, { timeout: 30_000 }).then(unwrap),

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

  // Soft-deletes the version (MLModelVersionDetailView). The active version
  // can't be deleted — the backend returns a 400 telling the admin to
  // activate a different version first.
  delete: (id: number): Promise<void> => api.delete(`${BASE}${id}/`).then(() => undefined),
};
