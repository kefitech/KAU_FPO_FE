"use client";

import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";


const SERVICES = [
  {
    id: 1,
    thumb: "1.jpg",
    title: "Crop Advisory",
    description: "AI-powered crop recommendations tailored to Kerala's climate and soil conditions.",
  },
  {
    id: 2,
    thumb: "2.jpg",
    title: "Market Linkage",
    description: "Direct connection to ONDC, FarmerConnect and other agricultural markets.",
  },
  {
    id: 3,
    thumb: "3.jpg",
    title: "Expert Consultancy",
    description: "Connect with KAU agronomists and agricultural experts for real-time guidance.",
  },
  {
    id: 4,
    thumb: "4.jpg",
    title: "Government Schemes",
    description: "Discover and apply for relevant government welfare schemes and subsidies.",
  },
  {
    id: 5,
    thumb: "5.jpg",
    title: "Financial Support",
    description: "Access credit facilities, grants and financial products for FPO growth.",
  },
];

export function Features() {
  return (
    <div id="services" className="services-style-one-area default-padding bg-gray half-bg-theme">
      <div className="shape-extra">
        <Image src="/images/agrul/shape/18.png" alt="shape" width={200} height={200} />
      </div>

      {/* Section Title */}
      <div className="container">
        <div className="heading-left">
          <div className="row">
            <div className="col-lg-5">
              <div className="left-info">
                <h5 className="sub-title">What We Offer</h5>
                <h2 className="title">
                  Services for <br /> FPO Members
                </h2>
              </div>
            </div>
            <div className="col-lg-6 offset-lg-1">
              <div className="right-info">
                <p>
                  From expert consultancy to market linkage, the KAU-FPO Platform provides
                  comprehensive digital services to help Farmer Producer Organizations thrive
                  in Kerala&apos;s agricultural ecosystem.
                </p>
                <Link className="btn btn-theme btn-md radius animation" href="/register">
                  Join the Programme
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <Swiper
              className="services-style-one-carousel"
              loop={true}
              slidesPerView={1}
              spaceBetween={30}
              autoplay={{ delay: 3000, disableOnInteraction: false }}
              pagination={{ el: ".swiper-pagination", clickable: true }}
              navigation={{ nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }}
              breakpoints={{
                768: { slidesPerView: 2 },
                992: { slidesPerView: 3 },
                1199: { slidesPerView: 4 },
              }}
              modules={[Navigation, Pagination, Autoplay]}
            >
              {SERVICES.map((service) => (
                <SwiperSlide key={service.id}>
                  <div className="services-style-one">
                    <div className="thumb">
                      <Image
                        src={`/images/agrul/thumb/${service.thumb}`}
                        alt={service.title}
                        width={400}
                        height={280}
                      />
                    </div>
                    <h5>
                      <Link href="/register">{service.title}</Link>
                    </h5>
                    <p>{service.description}</p>
                  </div>
                </SwiperSlide>
              ))}
              <div className="swiper-button-prev" />
              <div className="swiper-button-next" />
              <div className="swiper-pagination" />
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
}
