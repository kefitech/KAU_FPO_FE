"use client";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay, FreeMode } from "swiper/modules";
import { galleryData } from "../_data/gallery";

const Gallery = () => {
  return (
    <div className="gallery-style-one-area default-padding-top">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Awesome Gallery</h5>
              <h2 className="title">Gallery Of Our Products</h2>
              <div className="devider" />
            </div>
          </div>
        </div>
      </div>
      <div className="container container-stage">
        <div className="row">
          <div className="col-xl-12">
            <Swiper
              className="carousel-stage-right carousel-style-one"
              loop={true}
              freeMode={true}
              grabCursor={true}
              slidesPerView={1}
              spaceBetween={15}
              autoplay={{ delay: 3000, disableOnInteraction: false }}
              pagination={{ el: ".swiper-pagination", clickable: true }}
              navigation={{ nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }}
              breakpoints={{ 768: { slidesPerView: 2 }, 1300: { slidesPerView: 2.5 } }}
              modules={[Navigation, Pagination, Autoplay, FreeMode]}
            >
              {galleryData.map((item) => (
                <SwiperSlide key={item.id}>
                  <div className="gallery-style-one">
                    <img src={`/assets/img/gallery/${item.thumb}`} alt={item.title} />
                    <div className="overlay">
                      <span>{item.category}</span>
                      <h4>
                        <Link href={`/project-details/${item.id}`}>{item.title}</Link>
                      </h4>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              <div className="swiper-pagination" />
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gallery;
