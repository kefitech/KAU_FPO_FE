"use client";
import { useEffect, useRef, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";

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
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/gallery/`)
      .then((r) => r.json())
      .then((json) => setPhotos((json.data as GalleryPhoto[]) ?? []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [locale]);

  if (!loading && photos.length === 0) return null;

  return (
    <div className="gallery-style-one-area bg-gray default-padding-top">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Capture The Moments</h5>
              <h2 className="title">Gallery</h2>
              <div className="devider" />
            </div>
          </div>
        </div>
      </div>

      <div className="gallery-coverflow-wrap">
        <div className="gallery-fade-edge gallery-fade-left" />
        <div className="gallery-fade-edge gallery-fade-right" />

        {loading ? (
          <div className="gallery-skeleton-row">
            {[0, 1, 2].map((i) => (
              <div key={i} className="gallery-skeleton-card" />
            ))}
          </div>
        ) : (
          <Swiper
            className="gallery-coverflow-swiper"
            effect="coverflow"
            grabCursor
            centeredSlides
            loop={photos.length > 2}
            slidesPerView="auto"
            speed={900}
            autoplay={{ delay: 3200, disableOnInteraction: false }}
            coverflowEffect={{
              rotate: 0,
              stretch: -20,
              depth: 220,
              modifier: 1,
              slideShadows: false,
            }}
            onBeforeInit={(swiper) => {
              // @ts-ignore
              swiper.params.navigation.prevEl = prevRef.current;
              // @ts-ignore
              swiper.params.navigation.nextEl = nextRef.current;
            }}
            navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
            modules={[Navigation, Autoplay, EffectCoverflow]}
          >
            {photos.map((photo) => (
              <SwiperSlide key={photo.id} className="gallery-coverflow-slide">
                <div className="gallery-card-modern">
                  <div
                    className="gallery-card-bg"
                    style={{ backgroundImage: `url(${photo.photo_url})` }}
                  />
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Gallery"}
                    className="gallery-card-img"
                  />
                  {photo.caption && (
                    <div className="gallery-card-caption">
                      <span className="gallery-card-caption-dot" />
                      <span className="gallery-card-caption-text">{photo.caption}</span>
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        <div className="gallery-coverflow-nav">
          <button ref={prevRef} type="button" className="gallery-nav-btn" aria-label="Previous photo">
            <i className="fas fa-arrow-left" />
          </button>
          <button ref={nextRef} type="button" className="gallery-nav-btn" aria-label="Next photo">
            <i className="fas fa-arrow-right" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .gallery-style-one-area {
          padding-top: 100px !important;
          padding-bottom: 100px !important;
        }
        .gallery-coverflow-wrap {
          position: relative;
          padding: 60px 0 40px;
          overflow-x: hidden;
          overflow-y: visible;
        }
        :global(.gallery-coverflow-swiper) {
          padding: 100px 0 50px;
          width: 100%;
          max-width: 100%;
          overflow: visible !important;
          height: auto !important;
          min-height: 450px;
        }
        .gallery-coverflow-swiper :global(.swiper-wrapper) {
          transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        }
        :global(.gallery-coverflow-swiper .gallery-coverflow-slide) {
          width: 400px;
          height: 400px;
          max-width: 80vw;
          max-height: 80vw;
          flex-shrink: 0;
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease;
        }
        :global(.gallery-coverflow-swiper .swiper-slide-active .gallery-card-modern) {
          transform: scale(1.15);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.28);
        }
        .gallery-card-modern {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.98);
          background: #f0f0f0;
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.6s ease;
        }
        .gallery-card-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          position: relative;
          z-index: 1;
          display: block;
        }
        .gallery-card-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(5px) brightness(0.7);
          transform: scale(1.2);
        }
        .gallery-card-caption {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1;
          padding: 8px 14px;
          border-radius: 30px;
          background: rgba(20, 20, 20, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        :global(.gallery-coverflow-swiper .swiper-slide-active .gallery-card-caption) {
          opacity: 1;
          transform: translateY(0);
        }
        .gallery-card-caption-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-primary);
          flex-shrink: 0;
        }
        .gallery-card-caption-text {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gallery-fade-edge {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 12%;
          z-index: 2;
          pointer-events: none;
        }
        .gallery-fade-left {
          left: 0;
          background: linear-gradient(to right, #eff2f5 15%, transparent);
        }
        .gallery-fade-right {
          right: 0;
          background: linear-gradient(to left, #eff2f5 15%, transparent);
        }
        .gallery-coverflow-nav {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 10px;
        }
        .gallery-nav-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid #d8d8d8;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-primary, #04000b);
          transition: all 0.3s ease;
        }
        .gallery-nav-btn:hover {
          background: var(--color-primary, #49a760);
          border-color: var(--color-primary, #49a760);
          color: #fff;
        }
        .gallery-skeleton-row {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .gallery-skeleton-card {
          width: 200px;
          height: 200px;
          border-radius: 24px;
          background: #f0f0f0;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 991px) {
          :global(.gallery-coverflow-swiper .gallery-coverflow-slide),
          .gallery-skeleton-card {
            width: 350px;
            height: 350px;
          }
          :global(.gallery-coverflow-swiper) {
            padding-bottom: 20px;
          }
          :global(.gallery-coverflow-swiper .swiper-slide-active .gallery-card-modern) {
            transform: scale(1.05);
          }
        }
        @media (max-width: 576px) {
          :global(.gallery-coverflow-swiper .gallery-coverflow-slide),
          .gallery-skeleton-card {
            width: 300px;
            height: 300px;
          }
          .gallery-fade-edge {
            width: 6%;
          }
        }
        @media (min-width: 992px) {
          .gallery-coverflow-wrap {
            overflow: visible;
          }
          :global(.gallery-coverflow-swiper) {
            overflow: visible !important;
          }
        }
        @media (max-width: 1200px) {
          :global(.gallery-coverflow-swiper .gallery-coverflow-slide) {
            width: 350px;
            height: 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default Gallery;