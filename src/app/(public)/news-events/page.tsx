"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useLocaleStore } from "@/stores/locale-store";
import DOMPurify from "isomorphic-dompurify";

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

const ITEMS_PER_PAGE = 6;

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

// ─── Detail Modal — matches this page's card style ─────────────────────────────

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
        {/* Thumbnail banner */}
        {/* <div style={{ position: "relative", width: "100%", height: 220, flexShrink: 0, background: "#f0f0f0" }}>
          <img
            src={item.thumbnail_url || "/assets/img/news-placeholder.jpg"}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(255,255,255,0.9)",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "#333",
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div> */}

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
  const [selected, setSelected] = useState<Announcement | null>(null);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    if(!locale) return;
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/announcements/?page_size=100`)
      .then((r) => r.json())
      .then((json) => setItems((json.data as Announcement[]) ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const filtered = items.filter((i) => i.category === activeTab);
  type TabKey = "announcement" | "news";

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "announcement", label: "Announcements", icon: "fas fa-bullhorn" },
    { key: "news", label: "News", icon: "fas fa-newspaper" },
  ];

  return (
    <AgrulLayout>
      <BreadCrumb title="Latest Updates - News / Events" breadCrumb="News & Events" />
      <div className="blog-area blog-grid default-padding">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 40 }}>
            {TABS.map((tab) => {
              const count = items.filter((i) => i.category === tab.key).length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    margin: "0 8px",
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
                  {!loading && count > 0 && (
                    <span
                      style={{
                        background: isActive ? "rgba(255,255,255,0.25)" : "var(--color-primary)",
                        color: "var(--white)",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "1px 8px",
                        lineHeight: 1.6,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="blog-item-box">
            <div className="row">
              {loading ? (
                [0, 1, 2, 3, 4, 5].map((i) => (
                  <div className="col-xl-6 col-md-12 single-item mb-30" key={i}>
                    <CardSkeleton />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="col-12 text-center" style={{ padding: "60px 0", color: "#888" }}>
                  No news or events available at the moment.
                </div>
              ) : (
                filtered.map((item) => (
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
                      {/* Thumbnail */}
                      {/* <div
                        style={{
                          width: 110,
                          height: 110,
                          borderRadius: 8,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "#f0f0f0",
                        }}
                      >
                        <img
                          src={item.thumbnail_url || "/assets/img/news-placeholder.jpg"}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div> */}

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
                          {/* Divider */}
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

          {!loading && items.length > ITEMS_PER_PAGE && (
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
