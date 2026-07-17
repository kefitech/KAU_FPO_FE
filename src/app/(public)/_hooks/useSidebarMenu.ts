"use client";

import { useSidebarStore } from "@/stores/sidebar-store";

const useSidebarMenu = () => {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const openMenu = useSidebarStore((s) => s.openMenu);
  const closeMenu = useSidebarStore((s) => s.closeMenu);

  return { isOpen, openMenu, closeMenu };
};

export default useSidebarMenu;
