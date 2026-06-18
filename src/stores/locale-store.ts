/**
 * Locale Store
 * Zustand store for language/locale management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = string;

interface LocaleState {
  locale: Locale;
  isRTL: boolean;
  hasUserChosen: boolean;
  setLocale: (locale: Locale, isRTL?: boolean) => void;
  setDefaultLocale: (locale: Locale, isRTL?: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "",
      isRTL: false,
      hasUserChosen: false,

      // Called when user explicitly picks a language from the switcher
      setLocale: (locale, isRTL = false) =>
        set({ locale, isRTL, hasUserChosen: true }),

      // Called on page load to sync with API default — only applies if user hasn't chosen
      setDefaultLocale: (locale, isRTL = false) =>
        set((s) => s.hasUserChosen ? s : { locale, isRTL, hasUserChosen: false }),
    }),
    {
      name: "locale-storage",
    },
  ),
);
