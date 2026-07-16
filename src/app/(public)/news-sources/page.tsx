"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";
import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import { LogoBox } from "../_components/news-sources";
import type { NewsSource, NewsSourcesData } from "../_components/news-sources";

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 160,
            height: 90,
            borderRadius: 6,
            background: "#e8e8e8",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SourceSection({ title, icon, sources }: { title: string; icon: string; sources: NewsSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div style={{ marginBottom: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <i className={icon} style={{ fontSize: 20, color: "var(--color-primary)" }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-heading)", margin: 0, fontFamily: "var(--font-default)" }}>
          {title}
        </h3>
        <span
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            padding: "1px 10px",
            lineHeight: 1.8,
          }}
        >
          {sources.length}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {sources.map((s) => (
          <div key={s.id} style={{ width: 200 }}>
            <LogoBox source={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewsSourcesPage() {
  const [data, setData] = useState<NewsSourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    if(!locale) return;
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/news-sources/`)
      .then((r) => r.json())
      .then((json) => setData(json.data as NewsSourcesData))
      .catch(() => setData({ newspaper: [], magazine: [] }))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <AgrulLayout>
      <BreadCrumb title="In the News" breadCrumb="News Sources" />
      <div className="default-padding">
        <div className="container">
          {loading ? (
            <>
              <div style={{ marginBottom: 50 }}>
                <div style={{ width: 160, height: 24, borderRadius: 4, background: "#e8e8e8", marginBottom: 24, animation: "pulse 1.5s ease-in-out infinite" }} />
                <SkeletonRow />
              </div>
              <div>
                <div style={{ width: 120, height: 24, borderRadius: 4, background: "#e8e8e8", marginBottom: 24, animation: "pulse 1.5s ease-in-out infinite" }} />
                <SkeletonRow />
              </div>
            </>
          ) : !data || (data.newspaper.length === 0 && data.magazine.length === 0) ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888", fontFamily: "var(--font-default)", fontSize: 15 }}>
              No news sources available at the moment.
            </div>
          ) : (
            <>
              <SourceSection title="Newspapers" icon="fas fa-newspaper" sources={data.newspaper} />
              <SourceSection title="Magazines" icon="fas fa-book-open" sources={data.magazine} />
            </>
          )}
        </div>
      </div>
    </AgrulLayout>
  );
}
