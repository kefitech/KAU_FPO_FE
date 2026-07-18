"use client";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay, FreeMode } from "swiper/modules";

interface GalleryPhoto {
  id: number;
  photo_url: string;
  caption: string;
  order: number;
}

const Gallery = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/gallery/`)
      .then((r) => r.json())
      .then((json) => setPhotos((json.data as GalleryPhoto[]) ?? []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [locale]);

  if (!loading && photos.length === 0) return null;

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
            {loading ? (
              <div style={{ display: "flex", gap: 15, overflow: "hidden" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      minWidth: "40%",
                      height: 320,
                      borderRadius: 8,
                      background: "#f0f0f0",
                      animation: "pulse 1.5s ease-in-out infinite",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            ) : (
              <Swiper
                className="carousel-stage-right carousel-style-one"
                loop={photos.length > 2}
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
                {photos.map((photo) => (
                  <SwiperSlide key={photo.id}>
                    <div className="gallery-style-one" style={{ position: "relative", overflow: "hidden" }}>
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || "Gallery"}
                        style={{
                          width: "100%",
                          height: "320px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      {photo.caption && (
                        <div
                          className="overlay"
                          style={{
                            display: "block",
                            position: "absolute",
                            left: 30,
                            right: 30,
                            bottom: 0,
                            boxSizing: "border-box",
                            overflow: "hidden",
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              overflowWrap: "break-word",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {photo.caption}
                          </h4>
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
                <div className="swiper-pagination" />
              </Swiper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gallery;