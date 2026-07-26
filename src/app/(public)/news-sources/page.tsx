"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";
import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import type { NewsSource } from "../_components/news-sources";

// ─── Constants ──────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 6;

type TabKey = "newspaper" | "magazine";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "newspaper", label: "Newspapers", icon: "fas fa-newspaper" },
  { key: "magazine", label: "Magazines", icon: "fas fa-book-open" },
];

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

// ─── Source card ────────────────────────────────────────────────────────────

function SourceCard({ source }: { source: NewsSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: 220,
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 24,
        boxShadow: "var(--box-shadow-regular)",
        borderLeft: "4px solid var(--color-primary)",
        textAlign: "center",
        transition: "box-shadow 0.25s",
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 8,
          background: "#f8f8f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {source.logo_url ? (
          // biome-ignore lint/performance/noImgElement: external/uploaded logo, not a local asset
          <img
            src={source.logo_url}
            alt={source.name}
            style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }}
          />
        ) : (
          <i className="fas fa-newspaper" style={{ fontSize: 30, color: "#ccc" }} />
        )}
      </div>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#1a1a1a",
          margin: 0,
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {source.name}
      </h3>
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewsSourcesPage() {
  const [items, setItems] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("newspaper");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    if (!locale) return;
    setLoading(true);
    publicFetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/news-sources/?category=${activeTab}&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`,
    )
      .then((r) => r.json())
      .then((json) => {
        setItems((json.data as NewsSource[]) ?? []);
        setTotalPages(json?.meta?.pagination?.total_pages ?? 1);
        setTotalCount(json?.meta?.pagination?.total_count ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale, activeTab, currentPage]);

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setCurrentPage(1);
  }

  return (
    <AgrulLayout>
      <BreadCrumb title="In the News" breadCrumb="News Sources" />
      <div className="default-padding">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 40 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    style={{
                      padding: "12px 30px",
                      borderRadius: 4,
                      border: "2px solid var(--color-primary)",
                      background: isActive ? "var(--color-primary)" : "transparent",
                      color: isActive ? "var(--white)" : "var(--color-primary)",
                      fontFamily: "var(--font-default)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      letterSpacing: "0.03em",
                      transition: "all 0.3s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <i className={tab.icon} />
                    {tab.label}
                    {isActive && !loading && totalCount > 0 && (
                      <span
                        style={{
                          background: "rgba(255,255,255,0.25)",
                          color: "var(--white)",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "1px 8px",
                          lineHeight: 1.6,
                        }}
                      >
                        {totalCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <SkeletonRow />
          ) : items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "#888",
                fontFamily: "var(--font-default)",
                fontSize: 15,
              }}
            >
              No {activeTab === "newspaper" ? "newspapers" : "magazines"} available at the moment.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
              {items.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="row">
              <div className="col-md-12 pagi-area text-center">
                <nav>
                  <ul className="pagination text-center" style={{ justifyContent: "center" }}>
                    <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="fas fa-angle-double-left" />
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <li key={page} className={`page-item${page === currentPage ? " active" : ""}`}>
                        <button type="button" className="page-link" onClick={() => setCurrentPage(page)}>
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item${currentPage === totalPages ? " disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <i className="fas fa-angle-double-right" />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </AgrulLayout>
  );
}