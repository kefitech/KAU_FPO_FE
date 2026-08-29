/**
 * DPR wizard state (client-side only).
 *
 * Deliberately minimal: React Query owns server state (project, sections, readiness).
 * This store only tracks transient UI state that has to be visible across the wizard
 * shell — dirty flags (so we can warn on navigation) and save-in-flight flags (so the
 * header can show a "Saving..." indicator aggregated across sections).
 *
 * No persistence — refresh = fresh state. If the user refreshes mid-edit,
 * unsaved-but-in-browser-form data is gone; last-saved server state is still there.
 */

import { create } from "zustand";

interface DprWizardState {
  /** section key -> true when form is dirty (fields changed since last save) */
  dirty: Record<string, boolean>;
  /** section key -> true when a save mutation is in flight */
  saving: Record<string, boolean>;

  // Actions
  markDirty: (key: string) => void;
  markClean: (key: string) => void;
  markSaving: (key: string) => void;
  markSaved: (key: string) => void;
  resetForProject: () => void;
}

/** Derived selectors — call from components with useDprWizardStore((s) => selectHasAnyDirty(s)) */
export const selectIsDirty = (state: DprWizardState, key: string) => !!state.dirty[key];
export const selectHasAnyDirty = (state: DprWizardState) =>
  Object.values(state.dirty).some(Boolean);
export const selectHasAnySaving = (state: DprWizardState) =>
  Object.values(state.saving).some(Boolean);

const initialState = {
  dirty: {} as Record<string, boolean>,
  saving: {} as Record<string, boolean>,
};

export const useDprWizardStore = create<DprWizardState>()((set) => ({
  ...initialState,

  markDirty: (key) =>
    set((state) => ({
      dirty: { ...state.dirty, [key]: true },
    })),

  markClean: (key) =>
    set((state) => {
      const next = { ...state.dirty };
      delete next[key];
      return { dirty: next };
    }),

  markSaving: (key) =>
    set((state) => ({
      saving: { ...state.saving, [key]: true },
    })),

  markSaved: (key) =>
    set((state) => {
      const nextSaving = { ...state.saving };
      delete nextSaving[key];
      const nextDirty = { ...state.dirty };
      delete nextDirty[key];
      return { saving: nextSaving, dirty: nextDirty };
    }),

  resetForProject: () => set(initialState),
}));
