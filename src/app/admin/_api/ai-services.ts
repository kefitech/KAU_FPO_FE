/**
 * AI Services — admin API wrapper.
 *
 * Backend: apps/accounts/api/admin/ai_services.py (created 2026-09-03 for
 * KAU RCD B.5 + provider-switching operational readiness).
 *
 * Endpoints (all under /api/admin/ai-services/):
 *   GET    /                       → list all 4 service rows
 *   GET    /providers/             → provider metadata + model pricing table
 *   GET    /<pk>/                  → detail
 *   PATCH  /<pk>/                  → update provider / model / key / cap / enabled
 *   POST   /<pk>/reset-usage/      → reset current-month totals
 */
import { api } from "@/lib/api/client";

export type AIProvider = "mock" | "anthropic" | "openai" | "google";

export type AIService = "dpr_narratives" | "chatbot" | "marketing" | "translate";

export interface AIServiceConfigRow {
  id: number;
  service: AIService;
  service_display: string;
  is_enabled: boolean;
  provider: AIProvider;
  provider_display: string;
  model_name: string;
  api_key_masked: string;
  monthly_cap_inr: string;
  alert_at_pct: number;
  usd_to_inr_rate: string;
  current_month_cost_inr: string;
  current_month_tokens: number;
  current_month_calls: number;
  budget_usage_pct: number | null;
  alert_sent: boolean;
  auto_disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIServiceConfigInput {
  is_enabled?: boolean;
  provider?: AIProvider;
  model_name?: string;
  /** Plain-text key — encrypted server-side. Send empty string to clear. */
  api_key?: string;
  monthly_cap_inr?: string | number;
  alert_at_pct?: number;
  usd_to_inr_rate?: string | number;
}

export interface AIProviderInfo {
  providers: Array<{
    value: AIProvider;
    label: string;
    default_model: string;
  }>;
  models_by_provider: Record<
    AIProvider,
    Array<{
      model: string;
      input_usd_per_mtoken: string;
      output_usd_per_mtoken: string;
    }>
  >;
}

export interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const BASE = "/admin/ai-services/";

export const aiServicesApi = {
  list: () =>
    api.get<Wrapped<AIServiceConfigRow[]>>(BASE).then((r) => r.data.data),

  providers: () =>
    api.get<Wrapped<AIProviderInfo>>(`${BASE}providers/`).then((r) => r.data.data),

  retrieve: (id: number) =>
    api.get<Wrapped<AIServiceConfigRow>>(`${BASE}${id}/`).then((r) => r.data.data),

  // Mutations return the FULL envelope (data + message) so callers can
  // surface the backend's message in their toast — the backend owns the
  // wording, and translations later can flow through one place.
  update: (id: number, patch: AIServiceConfigInput) =>
    api
      .patch<Wrapped<AIServiceConfigRow>>(`${BASE}${id}/`, patch)
      .then((r) => r.data),

  resetUsage: (id: number) =>
    api
      .post<Wrapped<AIServiceConfigRow>>(`${BASE}${id}/reset-usage/`)
      .then((r) => r.data),
};
