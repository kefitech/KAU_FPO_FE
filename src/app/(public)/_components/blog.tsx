"use client";

import { useEffect, useRef, useState } from "react";

import DOMPurify from "isomorphic-dompurify";

import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: number;
  title: string;
  body: string;
  category: "announcement" | "news";
  published_date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AnnouncementModal({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
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
    // biome-ignore lint/a11y/useSemanticElements: overlay backdrop can't be a <button> since it wraps other interactive content (close button, modal body)
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
          background: "var(--white)",
          borderRadius: 10,
          width: "100%",
          maxWidth: 620,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
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
              <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-default)" }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: 5 }} />
                {formatDate(item.published_date)}
              </span>
            </div>
            <h4
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-heading)",
                lineHeight: 1.4,
                margin: 0,
                fontFamily: "var(--font-default)",
                wordBreak: "break-word",
              }}
            >
              {item.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f5f5f5",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "#555",
              flexShrink: 0,
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto" }}>
          <div
            style={{ width: 40, height: 3, background: "var(--color-secondary)", borderRadius: 2, marginBottom: 18 }}
          />
          <div
            style={{
              fontSize: 15,
              color: "#555",
              lineHeight: 1.9,
              margin: 0,
              fontFamily: "var(--font-default)",
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

// ─── Card ─────────────────────────────────────────────────────────────────────

function AnnouncementCard({ item, onReadMore }: { item: Announcement; onReadMore: (item: Announcement) => void }) {
  const isAnnouncement = item.category === "announcement";
  return (
    <div
      style={{
        background: "var(--white)",
        borderRadius: 8,
        padding: "28px 24px",
        height: "100%",
        boxShadow: "var(--box-shadow-regular)",
        borderLeft: "4px solid var(--color-primary)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "box-shadow 0.3s",
      }}
    >
      {/* Category badge + date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <span
          style={{
            display: "inline-block",
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
        <span
          style={{
            fontSize: 12,
            color: "#888",
            fontFamily: "var(--font-default)",
          }}
        >
          <i className="fas fa-calendar-alt" style={{ marginRight: 5 }} />
          {formatDate(item.published_date)}
        </span>
      </div>

      {/* Title */}
      <h4
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--color-heading)",
          lineHeight: 1.45,
          margin: 0,
          fontFamily: "var(--font-default)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {item.title}
      </h4>

      {/* Divider */}
      <div style={{ width: 40, height: 3, background: "var(--color-secondary)", borderRadius: 2 }} />

      {/* Body */}
      <div
        style={{
          fontSize: 14,
          color: "#666",
          lineHeight: 1.8,
          margin: 0,
          fontFamily: "var(--font-default)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flexGrow: 1,
          width: "100%", // 👈 force it, don't rely on stretch
          minWidth: 0, // 👈 safety net
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }}
      />

      {/* Read More */}
      <button
        type="button"
        onClick={() => onReadMore(item)}
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
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      style={{
        background: "var(--white)",
        borderRadius: 8,
        padding: "28px 24px",
        boxShadow: "var(--box-shadow-regular)",
        borderLeft: "4px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {[40, 80, 100, 90, 65].map((w, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          key={i}
          style={{
            height: i === 0 ? 20 : i === 1 ? 22 : 14,
            borderRadius: 4,
            background: "#f0f0f0",
            width: `${w}%`,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ─── Blog Section ─────────────────────────────────────────────────────────────

type TabKey = "announcement" | "news";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "announcement", label: "Announcements", icon: "fas fa-bullhorn" },
  { key: "news", label: "News", icon: "fas fa-newspaper" },
];

const Blog = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("announcement");
  const [selected, setSelected] = useState<Announcement | null>(null);

  const locale = useLocaleStore((s) => s.locale);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch intentionally triggered on locale change
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/announcements/?page_size=20`)
      .then((r) => r.json())
      .then((json) => setItems((json.data as Announcement[]) ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  const filtered = items.filter((i) => i.category === activeTab);

  const colClass =
    filtered.length === 1
      ? "col-lg-6 offset-lg-3 col-md-12"
      : filtered.length === 2
        ? "col-lg-6 col-md-6"
        : "col-lg-4 col-md-6";

  return (
    <div className="blog-area home-blog default-padding bottom-less">
      <div className="container">
        {/* Section heading */}
        <div className="row">
          <div className="offset-lg-2 col-lg-8">
            <div className="site-heading text-center">
              <h5 className="sub-heading">Latest Updates</h5>
              <h2 className="title">News &amp; Announcements</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        {/* Tab switcher */}
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

        {/* Cards */}
        <div className="row">
          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="col-lg-4 col-md-6 mb-30">
                <CardSkeleton />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div
              className="col-12 text-center"
              style={{ padding: "48px 0", color: "#888", fontFamily: "var(--font-default)", fontSize: 15 }}
            >
              No {activeTab === "announcement" ? "announcements" : "news"} available at the moment.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className={`${colClass} mb-30`}>
                <AnnouncementCard item={item} onReadMore={setSelected} />
              </div>
            ))
          )}
        </div>

        <AnnouncementModal item={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
};

export default Blog;
