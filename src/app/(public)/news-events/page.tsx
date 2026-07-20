"use client";

import { useEffect, useRef, useState } from "react";

import DOMPurify from "isomorphic-dompurify";

import { useLocaleStore } from "@/stores/locale-store";

import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import { publicFetch } from "../_lib/public-fetch";

interface Announcement {
  id: number;
  title: string;
  body: string;
  category: "announcement" | "news";
  published_date: string;
  thumbnail_url?: string | null;
}

type TabKey = "announcement" | "news";

const ITEMS_PER_PAGE = 6;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "announcement", label: "Announcements", icon: "fas fa-bullhorn" },
  { key: "news", label: "News", icon: "fas fa-newspaper" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(html: string, maxLen = 130): string {
  const text = stripHtml(html);
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}...` : text;
}

function CardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        height: "100%",
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 8,
          background: "#f0f0f0",
          flexShrink: 0,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
        <div
          style={{
            width: 100,
            height: 22,
            borderRadius: 12,
            background: "#f0f0f0",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "80%",
            height: 18,
            borderRadius: 4,
            background: "#f0f0f0",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "95%",
            height: 14,
            borderRadius: 4,
            background: "#f0f0f0",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AnnouncementDetailModal({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  if (!item) return null;

  const isAnnouncement = item.category === "announcement";
  return (
    // biome-ignore lint/a11y/useSemanticElements: overlay backdrop can't be a <button> since it wraps other interactive content
    <div
      ref={overlayRef}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,0,11,0.65)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 640,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Content */}
        <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "3px 14px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: isAnnouncement ? "var(--color-primary)" : "var(--dark)",
                color: "var(--white)",
              }}
            >
              {isAnnouncement ? "Announcement" : "News"}
            </span>
            <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-default)", textAlign: "right" }}>
              <i className="fas fa-calendar-alt" style={{ marginRight: 5 }} />
              {formatDate(item.published_date)}
            </span>
          </div>

          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.4,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {item.title}
          </h3>

          <div
            style={{
              fontSize: 14,
              color: "#666",
              lineHeight: 1.8,
              margin: 0,
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }}
          />
        </div>
      </div>
    </div>
  );
}

export { AnnouncementDetailModal };

export default function NewsAndEvents() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("announcement");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    setLoading(true);
    publicFetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/announcements/?category=${activeTab}&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`,
      { headers: { "X-Language": locale || "en" } },
    )
      .then((r) => r.json())
      .then((json) => {
        setItems((json.data as Announcement[]) ?? []);
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
      <BreadCrumb title="Latest Updates - News / Events" breadCrumb="News & Events" />
      <div className="blog-area blog-grid default-padding">
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

          <div className="blog-item-box">
            <div className="row">
              {loading ? (
                [0, 1, 2, 3, 4, 5].map((i) => (
                  <div className="col-xl-6 col-md-12 single-item mb-30" key={i}>
                    <CardSkeleton />
                  </div>
                ))
              ) : items.length === 0 ? (
                <div className="col-12 text-center" style={{ padding: "60px 0", color: "#888" }}>
                  No {activeTab === "announcement" ? "announcements" : "news"} available at the moment.
                </div>
              ) : (
                items.map((item) => (
                  <div className="col-xl-6 col-md-12 single-item mb-30" key={item.id}>
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 20,
                        boxShadow: "var(--box-shadow-regular)",
                        borderLeft: "4px solid var(--color-primary)",
                        height: "100%",
                        transition: "box-shadow 0.25s",
                      }}
                    >
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <span
                          style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-default)", textAlign: "right" }}
                        >
                          <i className="fas fa-calendar-alt " style={{ marginRight: 5 }} />
                          {formatDate(item.published_date)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: 17,
                              fontWeight: 700,
                              color: "#1a1a1a",
                              lineHeight: 1.4,
                              margin: 0,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordWrap: "break-word",
                            }}
                          >
                            {item.title}
                          </h3>
                          <div
                            style={{ width: 40, height: 3, background: "var(--color-secondary)", borderRadius: 2 }}
                          />
                        </button>
                        <p
                          style={{
                            fontSize: 14,
                            color: "#777",
                            lineHeight: 1.6,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordWrap: "break-word",
                          }}
                        >
                          {excerpt(item.body)}
                        </p>

                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-default)",
                            fontWeight: 700,
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          Read More <i className="fas fa-arrow-right" style={{ fontSize: 11 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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

        <AnnouncementDetailModal item={selected} onClose={() => setSelected(null)} />
      </div>
    </AgrulLayout>
  );
}
