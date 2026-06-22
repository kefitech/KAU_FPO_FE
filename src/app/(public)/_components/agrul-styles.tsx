"use client";

import { useEffect } from "react";

const SHEETS = [
  { id: "agrul-bootstrap", href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
  { id: "agrul-swiper",    href: "https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css" },
  { id: "agrul-animate",   href: "/agrul/css/animate.css" },
  { id: "agrul-fa",        href: "/agrul/css/font-awesome.css" },
  { id: "agrul-flaticon",  href: "/agrul/css/flaticon-set.css" },
  { id: "agrul-elegant",   href: "/agrul/css/elegant-icons.css" },
  { id: "agrul-validnavs", href: "/agrul/css/validnavs.css" },
  { id: "agrul-helper",    href: "/agrul/css/helper.css" },
  { id: "agrul-style",     href: "/agrul/css/style.css" },
];

export function AgrulStyles() {
  useEffect(() => {
    const injected: HTMLLinkElement[] = [];

    for (const { id, href } of SHEETS) {
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      injected.push(link);
    }

    return () => {
      for (const link of injected) {
        link.parentNode?.removeChild(link);
      }
    };
  }, []);

  return null;
}
