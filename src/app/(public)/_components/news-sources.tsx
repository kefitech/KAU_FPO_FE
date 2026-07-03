"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

interface NewsSource {
  id: number;
  name: string;
  url: string;
  logo_url: string | null;
}

interface NewsSourcesData {
  newspaper: NewsSource[];
  magazine: NewsSource[];
}

// ─── Logo Box ─────────────────────────────────────────────────────────────────

function LogoBox({ source }: { source: NewsSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={source.name}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: "28px 32px",
        height: 130,
        background: "#fff",
        transition: "box-shadow 0.25s, border-color 0.25s",
        textDecoration: "none",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e0e0e0";
      }}
    >
      {source.logo_url ? (
        <img
          src={source.logo_url}
          alt={source.name}
          style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
        />
      ) : (
        <span
          style={{
            fontFamily: "var(--font-default)",
            fontWeight: 700,
            fontSize: 16,
            color: "#444",
            textAlign: "center",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {source.name}
        </span>
      )}
    </a>
  );
}

// ─── Landing Strip (first 4, Swiper carousel) ─────────────────────────────────

const NewsSourcesStrip = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/news-sources/`)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data as NewsSourcesData;
        const all = [...(data.newspaper ?? []), ...(data.magazine ?? [])];
        setSources(all);
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  });

  if (!loading && sources.length === 0) return null;

  const preview = sources.slice(0, 4);
  const hasMore = sources.length > 4;

  return (
    <div className="default-padding" style={{ background: "#f8f8f8" }}>
      <div className="container">
        {/* Heading */}
        <div className="row">
          <div className="offset-lg-2.col-lg-8">
            <div className="site-heading text-center">
              <h5 className="sub-heading">Media Coverage</h5>
              <h2 className="title">In the News</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div style={{ position: "relative", marginTop: 10 }}>
          {loading ? (
            <div style={{ display: "flex", gap: 24 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 130,
                    borderRadius: 8,
                    background: "#e8e8e8",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : preview.length > 3 ? (
            <div style={{ position: "relative", padding: "0 50px" }}>
              <Swiper
                modules={[Navigation, Autoplay]}
                loop={true}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                navigation={{ nextEl: ".news-swiper-next", prevEl: ".news-swiper-prev" }}
                spaceBetween={24}
                slidesPerView={1}
                breakpoints={{ 576: { slidesPerView: 2 }, 992: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } }}
              >
                {preview.map((s) => (
                  <SwiperSlide key={s.id}>
                    <LogoBox source={s} />
                  </SwiperSlide>
                ))}
              </Swiper>
              <button
                type="button"
                className="news-swiper-prev"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "2px solid var(--color-primary)",
                  background: "#fff",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                <i className="fas fa-chevron-left" />
              </button>
              <button
                type="button"
                className="news-swiper-next"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "2px solid var(--color-primary)",
                  background: "#fff",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              {preview.map((s) => (
                <div key={s.id} style={{ width: 240 }}>
                  <LogoBox source={s} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View All */}
        {!loading && hasMore && (
          <div className="text-center" style={{ marginTop: 36 }}>
            <Link href="/news-sources" className="btn btn-theme btn-md radius animation">
              View All <i className="fas fa-arrow-right ms-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export type { NewsSource, NewsSourcesData };
export { LogoBox, NewsSourcesStrip };
export default NewsSourcesStrip;
