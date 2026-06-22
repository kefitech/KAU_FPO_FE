"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay, EffectFade } from "swiper/modules";


const SLIDES = [
  {
    id: 1,
    bg: "/images/agrul/banner/1.jpg",
    subtitle: "Kerala Agricultural University",
    title: "Empowering Farmer Producer Organizations",
    description:
      "AI-based digital platform connecting FPOs, agricultural experts, and markets across all 14 districts of Kerala.",
  },
  {
    id: 2,
    bg: "/images/agrul/banner/2.jpg",
    subtitle: "KAU-FPO Linkage Programme",
    title: "Agriculture Matters to Future Development",
    description:
      "Register your FPO, access expert consultancy, apply for government schemes, and connect with markets — all in one place.",
  },
  {
    id: 3,
    bg: "/images/agrul/banner/3.jpg",
    subtitle: "Grow Together, Prosper Together",
    title: "Market Linkage & Expert Consultancy",
    description:
      "From crop recommendations to ONDC market integration — a complete ecosystem for Farmer Producer Organizations in Kerala.",
  },
];

export function Hero() {
  return (
    <div className="banner-area navigation-circle text-light banner-style-one zoom-effect overflow-hidden">
      <Swiper
        className="banner-fade"
        direction="horizontal"
        loop={true}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={3000}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ el: ".swiper-pagination", type: "bullets", clickable: true }}
        navigation={{ nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }}
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
      >
        {SLIDES.map((slide) => (
          <SwiperSlide key={slide.id} className="banner-style-one">
            <div
              className="banner-thumb"
              style={{ backgroundImage: `url(${slide.bg})` }}
            >
              <div className="container">
                <div className="row">
                  <div className="col-lg-8">
                    <div className="content">
                      <div className="sub-title">
                        <span>{slide.subtitle}</span>
                      </div>
                      <h2>{slide.title}</h2>
                      <p>{slide.description}</p>
                      <div className="button">
                        <Link className="btn btn-theme btn-md radius animation" href="/register">
                          Register Your FPO
                        </Link>
                        <Link className="btn btn-light btn-md radius video-btn" href="/v1/login">
                          Access Dashboard
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
        <div className="swiper-button-prev" />
        <div className="swiper-button-next" />
        <div className="swiper-pagination" />
      </Swiper>
    </div>
  );
}
