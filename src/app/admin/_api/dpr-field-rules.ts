/**
 * DPR Field Rules — admin API wrapper (KAU 2026-09-19).
 *
 * Backend: apps/accounts/api/admin/dpr/field_rules.py.
 * Level 2 rules: field-level show/hide inside a section based on
 * (a) whether specific components are selected on the project, or
 * (b) the value of a sibling field in the same section.
 *
 * Endpoints:
 *   GET    /admin/dpr/field-rules/                  — list (filterable)
 *   POST   /admin/dpr/field-rules/                  — create
 *   GET    /admin/dpr/field-rules/<id>/             — retrieve
 *   PATCH  /admin/dpr/field-rules/<id>/             — update
 *   DELETE /admin/dpr/field-rules/<id>/             — delete
 *   GET    /admin/dpr/field-rules/schema/           — dropdown options
 */
import { api } from "@/lib/api/client";

export type FieldRuleRecipe = "component_in" | "field_equals";
export type FieldRuleVisibility = "show_when" | "hide_when";

export interface FieldRuleComponent {
  id: number;
  code: string;
  label: string;
}

export interface FieldRule {
  id: number;
  data_element_key: string;
  field_name: string;
  recipe_type: FieldRuleRecipe;
  visibility: FieldRuleVisibility;
  required_components: number[];
  required_components_detail: FieldRuleComponent[];
  trigger_field: string;
  trigger_value: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FieldRulePayload {
  data_element_key: string;
  field_name: string;
  recipe_type: FieldRuleRecipe;
  visibility: FieldRuleVisibility;
  required_components?: number[];
  trigger_field?: string;
  trigger_value?: string;
  notes?: string;
}

export interface FieldRuleSchema {
  section_keys: string[];
  /** section_key → sorted list of concrete scalar field names on that
   *  section's model. Sections without an introspection mapping are absent
   *  from this map — FE should fall back to free-text input in that case. */
  section_fields: Record<string, string[]>;
  components: Array<{
    id: number;
    code: string;
    label_en: string;
    group: string;
  }>;
  recipe_types: Array<{ value: FieldRuleRecipe; label: string }>;
  visibility_directions: Array<{ value: FieldRuleVisibility; label: string }>;
}

interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

export interface FieldRuleFilters {
  section?: string;
  field?: string;
  recipe_type?: FieldRuleRecipe;
}

const BASE = "/admin/dpr/field-rules/";

export const dprFieldRulesApi = {
  schema: (): Promise<FieldRuleSchema> =>
    api.get<Wrapped<FieldRuleSchema>>(`${BASE}schema/`).then((r) => r.data.data),

  list: (filters: FieldRuleFilters = {}): Promise<FieldRule[]> =>
    api
      .get<Wrapped<FieldRule[]>>(BASE, { params: filters })
      .then((r) => r.data.data),

  create: (payload: FieldRulePayload): Promise<FieldRule> =>
    api.post<Wrapped<FieldRule>>(BASE, payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<FieldRulePayload>): Promise<FieldRule> =>
    api.patch<Wrapped<FieldRule>>(`${BASE}${id}/`, payload).then((r) => r.data.data),

  remove: (id: number): Promise<void> =>
    api.delete(`${BASE}${id}/`).then(() => undefined),
};
