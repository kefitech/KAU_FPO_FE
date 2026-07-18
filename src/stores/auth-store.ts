import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/types";
import type { FpoRedirect } from "@/types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  fpoRedirect: FpoRedirect | null;
  setUser: (user: User | null, redirect?: FpoRedirect | null) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  setFpoRedirect: (redirect: FpoRedirect | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      fpoRedirect: null,

      setUser: (user, redirect = null) => set({ user, isAuthenticated: !!user, fpoRedirect: redirect }),

      logout: () => set({ user: null, isAuthenticated: false, fpoRedirect: null }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      setFpoRedirect: (redirect) => set({ fpoRedirect: redirect }),
    }),
    {
      name: "auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        fpoRedirect: state.fpoRedirect,
      }),
    },
  ),
);
