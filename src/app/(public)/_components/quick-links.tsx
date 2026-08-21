"use client";

import { useEffect, useState } from "react";

import { publicFetch } from "../_lib/public-fetch";
import { useLocaleStore } from "@/stores/locale-store";
import { useTranslations } from "@/hooks/use-translations";

interface QuickLinks {
  id: number;
  name: string;
  url: string;
  logo_url: string;
}

function QuickLinkCard({ link }: { link: QuickLinks }) {
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
        height: 130,
        width: 200,
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

export default function QuickLinksSection() {
  const [quickLinks, setQuickLinks] = useState<QuickLinks[]>([]);
  const locale = useLocaleStore((s) => s.locale);
  const { t, loading } = useTranslations("quickLinks");

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/quick-links/`)
      .then((r) => r.json())
      .then((json) => setQuickLinks((json.data as QuickLinks[]) ?? []))
      .catch(() => {});
  }, [locale]);

  if (loading || quickLinks.length === 0) return null;

  return (
    <div className="quick-links-section default-padding-bottom">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">{t?.subtitle ?? "Access"}</h5>
              <h2 className="title">{t?.title ?? "Quick Links"}</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            marginTop: 32,
          }}
        >
          {quickLinks.map((link) => (
            <QuickLinkCard key={link.id} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
}
