"use client";

import { useEffect, useState } from "react";

import { publicFetch } from "../_lib/public-fetch";
import { useLocaleStore} from "@/stores/locale-store";
import { useTranslations } from "@/hooks/use-translations";
import { LogoLoop } from "@/components/LogoLoop";
interface QuickLinks {
  id: number;
  name: string;
  url: string;
  logo_url: string;
}

export default function QuickLinksSection() {
  const [quickLinks, setQuickLinks] = useState<QuickLinks[]>([]);
  const locale = useLocaleStore((s) => s.locale);
  const { t, loading } = useTranslations("quickLinks"); // ← confirm namespace key matches your i18n setup

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/quick-links/`)
      .then((r) => r.json())
      .then((json) => setQuickLinks((json.data as QuickLinks[]) ?? []))
      .catch(() => {
        // intentionally ignored
      });
  }, [locale]);

  if (loading || quickLinks.length === 0) return null;
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "32px 0" }}>
      <div style={{ height: "80px", position: "relative", overflow: "hidden" }}>
        <LogoLoop
          logos={quickLinks.map((q) => ({
            src: q.logo_url,
            alt: q.name,
            href: q.url,
          }))}
          speed={100}
          direction="left"
          logoHeight={48}
          logoWidth={96}
          fixedWidth
          gap={48}
          hoverSpeed={0}
          scaleOnHover
          fadeOut
          fadeOutColor="#ffffff"
          ariaLabel="Quick links"
        />
      </div>
    </div>
  );
}