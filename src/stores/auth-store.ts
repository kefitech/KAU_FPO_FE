import { create } from "zustand";
import { persist } from "zustand/middleware";
// arunima 07rd sep 2026-------------------------------
import type { BuyerRedirect } from "@/types/auth";
//----------------------------------------------------
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
  // arunima 07rd sep 2026-------------------------------
  buyerRedirect: BuyerRedirect | null;
  setBuyerRedirect: (redirect: BuyerRedirect | null) => void;
//----------------------------------------------------
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      fpoRedirect: null,
      //ARUNIMA 07 SEP
      buyerRedirect: null,
      //----------------

      setUser: (user, redirect = null) => set({ user, isAuthenticated: !!user, fpoRedirect: redirect }),
//arunima
      logout: () => set({ user: null, isAuthenticated: false, fpoRedirect: null, buyerRedirect: null }),
//------
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,

        })),

      setFpoRedirect: (redirect) => set({ fpoRedirect: redirect }),
      //ARUNIMA S 07 SEP
      setBuyerRedirect: (redirect) => set({ buyerRedirect: redirect }),
      //---------------------------
    }),
    {
      name: "auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        fpoRedirect: state.fpoRedirect,
        //ARUNIMA S 07 SEP 2026
        buyerRedirect: state.buyerRedirect,
        //------------------------
      }),
    },
  ),
);
