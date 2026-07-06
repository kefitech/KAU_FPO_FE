"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";
import { AnnouncementDetailModal } from "../blog-standard/page";

interface AnnouncementNews {
  id: number;
  title: string;
  body: string;
  category: "announcement" | "news";
  published_date: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const Blog = () => {
  const [items, setItems] = useState<AnnouncementNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnnouncementNews | null>(null);
  const locale = useLocaleStore((s) => s.locale);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch intentionally triggered on locale change
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/announcements/?page_size=4`)
      .then((r) => r.json())
      .then((json) => setItems((json.data as AnnouncementNews[]) ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale]);

  const preview = items.slice(0, 4);

  return (
    <div className="announcement-news-section" style={{ padding: "80px 0" }}>
      <div className="container">
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 44,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <h3 style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>News and Announcements</h3>
          <Link
            href="/blog-standard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--color-primary, #e8622c)",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              borderBottom: "2px solid var(--color-primary, #e8622c)",
              paddingBottom: 2,
            }}
          >
            See More <i className="fas fa-arrow-right" style={{ fontSize: 13 }} />
          </Link>
        </div>

        <div className="row align-items-stretch">
          {/* Left: featured image */}
          <div className="col-lg-6 mb-30">
            <div style={{ width: "100%", height: "100%", minHeight: 480, borderRadius: 16, overflow: "hidden" }}>
              <img
                src="/images/news-feature.jpg"
                alt="News and Announcements"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>

          {/* Right: list */}
          <div className="col-lg-6">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {loading
                ? [0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ padding: "20px 0", borderBottom: i < 3 ? "1px solid #eee" : "none" }}>
                      <div
                        style={{
                          height: 18,
                          width: "70%",
                          background: "#f0f0f0",
                          borderRadius: 4,
                          marginBottom: 12,
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          height: 14,
                          width: "40%",
                          background: "#f0f0f0",
                          borderRadius: 4,
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    </div>
                  ))
                : preview.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: "22px 0",
                        borderBottom: idx < preview.length - 1 ? "1px solid #eee" : "none",
                      }}
                    >
                      {/* Accent bar */}
                      <div style={{ width: 3, borderRadius: 2, background: "var(--color-primary)", flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#1a1a1a",
                            lineHeight: 1.4,
                            margin: "0 0 12px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.title}
                        </h4>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, color: "#888" }}>
                            Last Updated on {formatDate(item.published_date)}
                          </span>

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
                            Read More <i className="fas fa-arrow-right" style={{ fontSize: 12 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
      <AnnouncementDetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Blog;
