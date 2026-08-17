"use client";
import { useEffect, useState } from "react";

import { Autoplay, EffectFade} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

const SLIDES = [
  {
    id: 1,
    bgThumb: "17.jpg",
    subtitleKey: "slide1_subtitle",
    titleKey: "slide1_title",
    descKey: "slide1_desc",
    btnKey: "slide1_btn",
    btnHref: "/register",
  },
  {
    id: 2,
    bgThumb: "2.jpg",
    subtitleKey: "slide2_subtitle",
    titleKey: "slide2_title",
    descKey: "slide2_desc",
    btnKey: "slide2_btn",
    btnHref: "/about-us",
  },
];

const Banner = () => {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});
  const [nav, setNav] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "banner,nav").then((data) => {
      setT(data.banner ?? {});
      setNav(data.nav ?? {});
    });
  }, [locale]);

  return (
    <div className="banner-area top-pad-150 text-light banner-style-one zoom-effect overflow-hidden">
      <Swiper
        className="banner-fade"
        direction="horizontal"
        loop
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={3000}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        
        modules={[Autoplay, EffectFade]}
      >
        {SLIDES.map((slide) => {
          const subtitle = t[slide.subtitleKey] ?? "";
          const title = t[slide.titleKey] ?? "";
          const desc = t[slide.descKey] ?? "";
          const btnText = t[slide.btnKey] ?? "";
          const words = title.split(" ");
          const titleBold = words.slice(0, 2).join(" ");
          const titleRest = words.slice(2).join(" ");

          return (
            <SwiperSlide key={slide.id} className="banner-style-one">
              <div
                className="banner-thumb bg-cover shadow dark"
                style={{ background: `url(/assets/img/banner/${slide.bgThumb})` }}
              />

              {/* Quick access cards — desktop only, absolutely positioned on right */}
              <div style={{
                position: "absolute",
                right: 60,
                bottom: 100,
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                width: 300,
                height: "auto",
              }} className="d-none d-xl-flex">
                {[
                  { href: "/about-us",           icon: "fa-university",     navKey: "about_us",            descKey: "card_about_desc",     defaultTitle: "About Us",              defaultDesc: "About KAU-FPO Linkage Programme" },
                  { href: "/howtoregister",       icon: "fa-file-alt",       navKey: "how_to_register_FPO", descKey: "card_register_desc",  defaultTitle: "How To Register FPO",   defaultDesc: "Step-by-step registration guide" },
                  { href: "/news-announcements",  icon: "fa-bullhorn",       navKey: "events_updates",      descKey: "card_events_desc",    defaultTitle: "Events & Updates",      defaultDesc: "Latest announcements and news" },
                  { href: "/faq",                 icon: "fa-question-circle",navKey: "faqs",                descKey: "card_faq_desc",       defaultTitle: "FAQs",                  defaultDesc: "Frequently asked questions" },
                  { href: "/contact-us",          icon: "fa-envelope",       navKey: "contact_us",          descKey: "card_contact_desc",   defaultTitle: "Contact Us",            defaultDesc: "Get in touch with us" },
                  { href: "/more-info",           icon: "fa-info-circle",    navKey: "more_info",           descKey: "card_more_info_desc", defaultTitle: "More Info",             defaultDesc: "Resources, documents & guidelines" },
                ].map((card) => (
                  <a
                    key={card.href}
                    href={card.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      background: "rgba(0,0,0,0.35)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      textDecoration: "none",
                      color: "#fff",
                      transition: "background 0.2s, transform 0.2s",
                      height: "auto",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.55)";
                      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.35)";
                      (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: "rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <i className={`fas ${card.icon}`} style={{ fontSize: 18, color: "#f5c842" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                        {nav[card.navKey] ?? card.defaultTitle}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {t[card.descKey] ?? card.defaultDesc}
                      </div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ fontSize: 12, opacity: 0.6 }} />
                  </a>
                ))}
              </div>

              <div className="container">
                <div className="row align-center">
                  <div className="col-xl-7">
                    <div className="content">
                      <h4>{subtitle}</h4>
                      <h2>
                        <strong>{titleBold}</strong> {titleRest}
                      </h2>
                      <p>{desc}</p>
                      <div className="button" style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                        <a className="btn btn-theme secondary btn-md radius animation" href={slide.btnHref}>
                          {btnText}
                        </a>
                        <a
                          className="btn btn-md radius animation"
                          href="/v1/login"
                          style={{ background: "transparent", border: "2px solid #fff", color: "#fff" }}
                        >
                          {t.login_btn ?? "Login"}
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </SwiperSlide>
          );
        })}

      </Swiper>
    </div>
  );
};

export default Banner;
