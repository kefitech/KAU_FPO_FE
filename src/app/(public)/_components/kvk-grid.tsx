"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "@/hooks/use-translations";
import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

// KAU 2026-09-27: Krishi Vigyan Kendra directory grid — powers the public
// /krishi-vigyan-kendra route. Visually identical to QuickLinksSection
// (logo card grid) but hits its own admin-managed data source so the KVK
// list can grow independently of the landing-page Quick Links strip.

interface KVKLink {
  id: number;
  name: string;
  url: string;
  logo_url: string | null;
  order: number;
}

function KVKLinkCard({ link }: { link: KVKLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.name}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        padding: "18px 20px",
        height: 150,
        width: 220,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
        el.style.borderColor = "var(--color-primary, #49a760)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        el.style.borderColor = "#e8e8e8";
        el.style.transform = "translateY(0)";
      }}
    >
      {link.logo_url ? (
        <>
          <img
            src={link.logo_url}
            alt={link.name}
            style={{ maxHeight: 86, maxWidth: "100%", objectFit: "contain" }}
          />
          <span
            style={{
              color: "#333",
              fontWeight: 600,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {link.name}
          </span>
        </>
      ) : (
        <span
          style={{
            color: "#333",
            fontWeight: 700,
            fontSize: 13,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {link.name}
        </span>
      )}
    </a>
  );
}

export default function KVKGrid() {
  const [links, setLinks] = useState<KVKLink[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslations("kvk");

  // biome-ignore lint/correctness/useExhaustiveDependencies: locale intentionally triggers a refetch
  useEffect(() => {
    setLoading(true);
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/kvk-links/`)
      .then((r) => r.json())
      .then((json) => setLinks((json.data as KVKLink[]) ?? []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <div className="quick-links-section default-padding">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">
                {t?.subtitle ?? "Krishi Vigyan Kendra"}
              </h5>
              <h2 className="title">
                {t?.title ?? "KVK Directory"}
              </h2>
              <p className="text-muted" style={{ marginTop: 8 }}>
                {t?.description ??
                  "Krishi Vigyan Kendras (KVKs) are Kerala Agricultural University's district-level agri extension centres. Click any card to visit that KVK's website."}
              </p>
              <div className="devider" />
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            {t?.loading ?? "Loading KVKs…"}
          </p>
        ) : links.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            {t?.empty ?? "No KVK entries have been added yet."}
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
            }}
          >
            {links.map((link) => (
              <KVKLinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
