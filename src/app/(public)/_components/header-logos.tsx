"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";

type HeaderLogo = {
  id: number | string;
  name: string;
  logo_url: string | null;
  is_platform: boolean;
  order?: number; // 0-2 = header positions, 3 = mobile menu logo
};

const MAX_LOGOS = 3;
const MOBILE_ORDER = 3;
const FOOTER_ORDER = 4;

// Max width (px) of the 1st header logo — change this number to make it narrower/wider
const FIRST_LOGO_MAX_WIDTH = 400;

// Your current logos: shown until the API responds, or if it has none / is down.
const FALLBACK: HeaderLogo[] = [
  { id: "f1", name: "Dir_of_extLogo", logo_url: "/assets/img/Dir_of_ext.webp", is_platform: false },
  { id: "f2", name: "GOK Logo", logo_url: "/assets/img/GOK.webp", is_platform: false },
  { id: "f3", name: "SHM Logo", logo_url: "/assets/img/SHM_LOGO.webp", is_platform: false },
];

// Mobile menu / sidebar / login logo shown until the admin sets one, or if the API is down.
const MOBILE_FALLBACK_LOGO = "/assets/img/logo.webp";

// Header logos + mobile logo share one request while it is loading; a new request is made on each page load
let request: Promise<HeaderLogo[]> | null = null;
const loadLogos = () => {
  if (!request) {
    request = api
      .get("/public/header-logos/")
      .then((r) => (r.data as { data?: HeaderLogo[] }).data ?? [])
      .catch((err) => {
        console.error("Header logos failed to load:", err);
        return [];
      })
      .finally(() => {
        request = null; // next mount fetches fresh data (e.g. after the admin adds a logo)
      });
  }
  return request;
};

function useHeaderLogos() {
  const [logos, setLogos] = useState<HeaderLogo[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadLogos().then((list) => alive && setLogos(list));
    return () => {
      alive = false;
    };
  }, []);
  return logos; // null = still loading
}

/** Logos at the start of the header; goes inside <div className="navbar-logos">. */
const HeaderLogos = () => {
  const loaded = useHeaderLogos()?.filter((l) => (l.order ?? 0) < MOBILE_ORDER); // header positions only
  const logos = loaded?.length ? loaded : FALLBACK;

  return (
    <>
      {logos
        .filter((l) => l.logo_url)
        .slice(0, MAX_LOGOS)
        .map((l, i) => (
          <img
            key={l.id}
            src={l.logo_url as string}
            alt={l.name}
            className="logo logo-secondary"
            style={i === 0 ? { maxWidth: FIRST_LOGO_MAX_WIDTH, width: "auto", objectFit: "contain" } : undefined}
          />
        ))}
    </>
  );
};

/** Mobile menu / sidebar logo — always from the admin panel:
 *  "Mobile menu logo" (order 3), else Position 1. */
export const MobileMenuLogo = ({ className }: { className?: string }) => {
  const loaded = useHeaderLogos();

  const mobile =
    loaded?.find((l) => l.order === MOBILE_ORDER) ??
    loaded?.find((l) => l.order === 0) ??
    loaded?.find((l) => l.is_platform);

  // while loading keep the space so the layout doesn't jump
  if (loaded === null) return className ? <span className={className} aria-hidden /> : null;

  // API down or no logo set — show the original KAU logo
  if (!mobile?.logo_url) return <img src={MOBILE_FALLBACK_LOGO} alt="KAU" className={className} />;

  return <img src={mobile.logo_url} alt={mobile.name} className={className} />;
};
/** Footer logo — from the admin panel ("Footer logo").
 *  Until the admin adds one, the current footer image is kept. */
/** Footer logo — from the admin panel ("Footer logo").
 *  Always shown in the same square space as the original round badge;
 *  any uploaded image is fitted inside it without stretching or cropping. */
/** Footer logo — from the admin panel ("Footer logo").
 *  Shown as a white round badge (like the original KAU logo); the whole
 *  uploaded image always fits inside it, nothing is cropped. */
/** Footer logo — only from the admin panel ("Footer logo").
 *  Shown as a white round badge; the whole image always fits inside. */
export const FooterLogo = ({ className }: { className?: string }) => {
  const loaded = useHeaderLogos();
  const badgeStyle: React.CSSProperties = {
    aspectRatio: "1 / 1",
    borderRadius: "50%",
    backgroundColor: "#fff",
    padding: "3%",
    objectFit: "contain",
    boxSizing: "border-box",
  };

  const footer = loaded?.find((l) => l.order === FOOTER_ORDER);

  // loading, or no footer logo added yet → keep the space empty
  if (!footer?.logo_url)
    return <span className={className} style={{ ...badgeStyle, display: "inline-block" }} aria-hidden />;

  return <img className={className} style={badgeStyle} src={footer.logo_url} alt={footer.name} />;
};

export default HeaderLogos;
