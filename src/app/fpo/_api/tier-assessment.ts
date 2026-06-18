import { api } from "@/lib/api/client";
import type { TierAssessmentData, TierHistoryItem } from "@/types/fpo";

const BASE = "/fpo/me/tier-assessment/";

type AnswerValue = string | number | string[] | null;

export const tierAssessmentApi = {
  get: (): Promise<TierAssessmentData> =>
    api.get(BASE).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as TierAssessmentData;
    }),

  start: (): Promise<{ id: number }> =>
    api.post(BASE).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as { id: number };
    }),

  save: (id: number, answers: Record<string, AnswerValue>): Promise<void> =>
    api.patch(`${BASE}${id}/`, { answers }).then(() => undefined),

  submit: (id: number): Promise<void> =>
    api.post(`${BASE}${id}/submit/`).then(() => undefined),

  history: (): Promise<TierHistoryItem[]> =>
    api.get(`${BASE}history/`).then((r) => {
      const d = r.data;
      return (Array.isArray(d) ? d : ((d as Record<string, unknown>).data ?? [])) as TierHistoryItem[];
    }),

  upload: (id: number, questionNo: number, file: File): Promise<void> => {
    const form = new FormData();
    form.append("question_no", String(questionNo));
    form.append("file", file);
    return api
      .post(`${BASE}${id}/upload/`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then(() => undefined);
  },

  deleteUpload: (id: number, uploadId: number): Promise<void> =>
    api.delete(`${BASE}${id}/upload/${uploadId}/`).then(() => undefined),

  reopen: (id: number): Promise<void> =>
    api.post(`${BASE}${id}/reopen/`).then(() => undefined),
};
