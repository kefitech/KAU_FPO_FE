"use client";

import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,

  openMenu: () => {
    set({ isOpen: true });
    document.body.classList.add("no-fade");
    document.body.style.overflow = "hidden";
  },

  closeMenu: () => {
    set({ isOpen: false });
    document.body.classList.remove("no-fade");
    document.body.style.overflow = "";
  },
}));
