import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface MLModelVersion {
  id: number;
  version_code: string;
  description: string;
  is_active: boolean;
  deployed_at: string;
  model_file_path: string;
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

type Wrapped<T> = { status: string; message: string; data: T; warning?: string };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/admin/ml-models/";
const FEEDBACK_BASE = "/admin/recommendations/feedback/";

export const adminMlModelsApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<MLModelVersion>>(BASE, { params }).then((r) => r.data),

  create: (formData: FormData): Promise<MLModelVersion> =>
    api
      .post<Wrapped<MLModelVersion>>(BASE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
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
};