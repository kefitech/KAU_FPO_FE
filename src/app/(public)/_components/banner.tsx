"use client";
import { useEffect, useState } from "react";

import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

const SLIDES = [
  { id: 1, bgThumb: "17.jpg", subtitleKey: "slide1_subtitle", titleKey: "slide1_title", descKey: "slide1_desc", btnKey: "slide1_btn" },
  { id: 2, bgThumb: "2.jpg",  subtitleKey: "slide2_subtitle", titleKey: "slide2_title", descKey: "slide2_desc", btnKey: "slide2_btn" },
];

const Banner = () => {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "banner").then((data) => {
      setT(data.banner ?? {});
    });
  }, [locale]);

  return (
    <div className="banner-area text-light banner-style-one zoom-effect overflow-hidden">
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
        pagination={{
          el: ".swiper-pagination",
          type: "bullets",
          clickable: true,
        }}
        navigation={{
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        }}
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
      >
        {SLIDES.map((slide) => {
          const subtitle = t[slide.subtitleKey] ?? "";
          const title    = t[slide.titleKey]    ?? "";
          const desc     = t[slide.descKey]     ?? "";
          const btnText  = t[slide.btnKey]      ?? "";
          const words    = title.split(" ");
          const titleBold = words.slice(0, 2).join(" ");
          const titleRest = words.slice(2).join(" ");

          return (
            <SwiperSlide key={slide.id} className="banner-style-one">
              <div
                className="banner-thumb bg-cover shadow dark"
                style={{ background: `url(/assets/img/banner/${slide.bgThumb})` }}
              />
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
                        <a className="btn btn-theme secondary btn-md radius animation" href="/about-us">
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
        <div className="swiper-button-prev" />
        <div className="swiper-button-next" />
        <div className="swiper-pagination" />
      </Swiper>
    </div>
  );
};

export default Banner;
