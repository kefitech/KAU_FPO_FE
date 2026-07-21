"use client";
import { useState } from "react";

const useSubMenuToggle = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleSubMenu = (index: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return { openIndex, toggleSubMenu };
};

export default useSubMenuToggle;