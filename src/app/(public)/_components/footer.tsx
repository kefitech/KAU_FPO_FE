"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

interface QuickLink {
  id: number;
  name: string;
  url: string;
  logo_url: string | null;
}

function PartnerBox({ link }: { link: QuickLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.name}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 6,
        padding: "16px 20px",
        height: 90,
        width: 180,
        textDecoration: "none",
        transition: "background 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.15)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.35)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)";
      }}
    >
      {link.logo_url ? (
        <img src={link.logo_url} alt={link.name} style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }} />
      ) : (
        <span
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: "var(--font-default)",
            fontWeight: 700,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {link.name}
        </span>
      )}
    </a>
  );
}

const Footer = () => {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "nav").then((data) => {
      setT(data.nav ?? {});
    });
  }, [locale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: locale intentionally kept to allow future locale-based refetch
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/quick-links/`)
      .then((r) => r.json())
      .then((json) => setQuickLinks((json.data as QuickLink[]) ?? []))
      .catch(() => {
        // intentionally ignored
      });
  }, [locale]);

  return (
    <footer className="bg-dark text-light" style={{ backgroundImage: "url(/assets/img/shape/brush-down.png)" }}>
      <div className="container">
        {quickLinks.length > 0 && (
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "32px 0" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 24,
                fontFamily: "var(--font-default)",
              }}
            >
              {t.our_partners ?? "Our Partners"}
            </p>
            <div style={{ position: "relative", padding: quickLinks.length > 4 ? "0 48px" : "0" }}>
              {quickLinks.length > 4 ? (
                <>
                {(() => {
                const swiperLinks =
                  quickLinks.length < 10
                    ? Array(Math.ceil(10 / quickLinks.length)).fill(quickLinks).flat()
                    : quickLinks;
                return (
                  <Swiper
                    modules={[Navigation, Autoplay]}
                    loop={quickLinks.length > 1}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    navigation={{ nextEl: ".ql-swiper-next", prevEl: ".ql-swiper-prev" }}
                    spaceBetween={16}
                    slidesPerView={1}
                    centeredSlides={true}
                    style={{ width: "100%" }}
                    breakpoints={{ 576: { slidesPerView: 2 }, 992: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } }}
                  >{swiperLinks.map((link, i) => (
                      <SwiperSlide key={`${link.id}-${i}`} style={{ display: "flex", justifyContent: "center" }}>
                        <PartnerBox link={link} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                );
              })()}
                  <button
                    type="button"
                    className="ql-swiper-prev"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    <i className="fas fa-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="ql-swiper-next"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {quickLinks.map((link) => (
                    <PartnerBox key={link.id} link={link} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="f-items default-padding">
          <div className="row">
            <div className="col-lg-4 col-md-6 item">
              <div className="footer-item about">
                <img className="logo" src="/assets/img/logo.png" alt="Logo" />
              </div>
            </div>

            <div className="col-lg-2 col-md-6 item">
              <div className="footer-item link">
                <h4 className="widget-title">{t.explore ?? "Explore"}</h4>
                <ul>
                  <li>
                    <Link href="/about-us">{t.about_us ?? "About Us"}</Link>
                  </li>
                  <li>
                    <Link href="/team">{t.meet_our_team ?? "Meet Our Team"}</Link>
                  </li>
                  <li>
                    <Link href="/news-events">{t.news_media ?? "News & Media"}</Link>
                  </li>
                  <li>
                    <Link href="/contact-us">{t.contact_us ?? "Contact Us"}</Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* <div className="col-lg-3 col-md-6 item">
              <div className="footer-item recent-post">
                <h4 className="widget-title">Recent Posts</h4>
                <ul>
                  <li>
                    <div className="thumb">
                      <Link href="/blog-single-with-sidebar/1">
                        <img src="/assets/img/thumbs/3.jpg" alt="Thumb" />
                      </Link>
                    </div>
                    <div className="info">
                      <div className="meta-title"><span className="post-date">12 Sep, 2024</span></div>
                      <h5><Link href="/blog-single-with-sidebar/1">Meant widow equal an share least part.</Link></h5>
                    </div>
                  </li>
                  <li>
                    <div className="thumb">
                      <Link href="/blog-single-with-sidebar/2">
                        <img src="/assets/img/thumbs/5.jpg" alt="Thumb" />
                      </Link>
                    </div>
                    <div className="info">
                      <div className="meta-title"><span className="post-date">18 Jul, 2024</span></div>
                      <h5><Link href="/blog-single-with-sidebar/2">Future Plan &amp; Strategy for Construction</Link></h5>
                    </div>
                  </li>
                </ul>
              </div>
            </div> */}

            <div className="col-lg-3 col-md-6 item">
              <div className="footer-item contact">
                <h4 className="widget-title">{t.contact_info ?? "Contact Info"}</h4>
                <ul>
                  <li>
                    <div className="icon">
                      <i className="fas fa-home" />
                    </div>
                    <div className="content">
                      <strong>{t.address ?? "Address"}:</strong><a href="https://maps.app.goo.gl/4FXjLWkpN5jvM8N17">Kerala Agricultural University, Mannuthy P.O, Pin- 680651.</a>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <i className="fas fa-envelope" />
                    </div>
                    <div className="content">
                      <strong>Email:</strong> <a href="mailto:registrar@kau.in">registrar@kau.in</a>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <i className="fas fa-phone" />
                    </div>
                    <div className="content">
                      <strong>Phone:</strong> <a href="tel:+91 487 237 0509">+91 487 237 0509</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="row">
            <div className="col-lg-6">
              <p>
                &copy; Copyright {new Date().getFullYear()}. All Rights Reserved by{" "}
                <a href="https://www.kefitech.com/" target="_blank" rel="noopener noreferrer">
                  Kefi Tech Solutions Pvt Ltd
                </a>
              </p>
            </div>
            <div className="col-lg-6 text-end">
              <ul>
                {/* <li><Link href="/about-us">Terms</Link></li>
                <li><Link href="/about-us">Privacy</Link></li> */}
                <li>
                  <Link href="/contact-us">{t.support ?? "Support"}</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="shape-right-bottom">
        <img src="/assets/img/shape/10.png" alt="shape" />
      </div>
      <div className="shape-left-bottom">
        <img src="/assets/img/shape/11.png" alt="shape" />
      </div>
    </footer>
  );
};

export default Footer;
