"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay, EffectFade } from "swiper/modules";
import { bannerData } from "../_data/banner";

const Banner = () => {
  return (
    <div className="banner-area  text-light banner-style-one zoom-effect overflow-hidden">
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
        {bannerData.map((banner) => (
          <SwiperSlide key={banner.id} className="banner-style-one">
            <div className="banner-thumb bg-cover shadow dark"
              style={{ background: `url(/assets/img/banner/${banner.bgThumb})` }} />
            <div className="container">
              <div className="row align-center">
                <div className="col-xl-7">
                  <div className="content">
                    <h4>{banner.subtitle}</h4>
                    <h2>
                      <strong>{banner.title?.split(" ").slice(0, 2).join(" ")}</strong>{" "}
                      {banner.title?.split(" ").slice(2).join(" ")}
                    </h2>
                    <p>{banner.description}</p>
                    <div className="button" style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                      <a className="btn btn-theme secondary btn-md radius animation" href="/about-us">
                        {banner.buttonText}
                      </a>
                      <a className="btn btn-md radius animation" href="/v1/login"
                        style={{ background: "transparent", border: "2px solid #fff", color: "#fff" }}>
                        Login
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
        <div className="swiper-button-prev" />
        <div className="swiper-button-next" />
      </Swiper>
    </div>
  );
};

export default Banner;
