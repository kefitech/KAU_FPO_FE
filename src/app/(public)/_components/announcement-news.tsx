"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import CountUp from "react-countup";

import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";
import { AnnouncementDetailModal } from "../news-events/page";

interface AnnouncementNews {
  id: number;
  title: string;
  body: string;
  category: "announcement" | "news";
  published_date: string;
}

type TabKey = "announcement" | "news";

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

const NewsWidget = () => {
  const [items, setItems] = useState<AnnouncementNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnnouncementNews | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("announcement");
  const [totalCount, setTotalCount] = useState(0);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    setLoading(true);
    publicFetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/announcements/?category=${activeTab}&page_size=4&page=1`,
      { headers: { "X-Language": locale || "en" } },
    )
      .then((r) => r.json())
      .then((json) => {
        setItems((json.data as AnnouncementNews[]) ?? []);
        setTotalCount(json?.meta?.pagination?.total_count ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locale, activeTab]);

  return (
    <div className="announcement-news-section" style={{ padding: "80px 0" }}>
      <div className="container">
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <h3 style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>News and Announcements</h3>
          <Link
            href="/news-events"
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

        {/* Tabs */}
        <div className="tab-btn-wrapper" style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 24px",
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

        <div className="container">
          <div className="row align-center">
            {/* Left: featured image */}
            <div className="col-lg-6 choose-us-style-one">
              <div className="thumb">
                <div style={{ width: "100%", height: "100%", minHeight: 300, borderRadius: 16, overflow: "hidden" }}>
                  <img
                    src="/assets/img/announcement/1.jpeg"
                    alt="News and Announcements"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div className="shape">
                    <img src="/assets/img/shape/22.png" alt="shape" data-aos="fade-down" data-aos-delay="100" />
                  </div>
                  <div className="product-produce">
                    <div className="icon">
                      <i className="flaticon-farmer" />
                    </div>
                    <div className="fun-fact">
                      <div className="counter">
                        <div className="timer">
                          <CountUp key={`${activeTab}-${totalCount}`} end={totalCount} enableScrollSpy scrollSpyOnce />
                        </div>
                        <div className="operator" />
                      </div>
                      <span className="medium">{activeTab === "announcement" ? "Announcements" : "News"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: list */}
            <div className="col-lg-6">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
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
                ) : items.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
                    No {activeTab === "announcement" ? "announcements" : "news"} available at the moment.
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: "22px 0",
                        borderBottom: idx < items.length - 1 ? "1px solid #eee" : "none",
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
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AnnouncementDetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default NewsWidget;
