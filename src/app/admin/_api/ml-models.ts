import { api } from "@/lib/api/client";

export interface MLModelVersion {
  id: number;
  version_code: string;
  description: string;
  is_active: boolean;
  deployed_at: string;
  model_file_path: string;
}

type Wrapped<T> = { status: string; message: string; data: T; warning?: string };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/admin/ml-models/";

export const adminMlModelsApi = {
  getAll: (): Promise<MLModelVersion[]> => api.get<Wrapped<MLModelVersion[]>>(BASE).then(unwrap),

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
};