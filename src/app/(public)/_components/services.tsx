"use client";

import Link from "next/link";

import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { serviceData } from "../_data/services";

const Services = () => {
  return (
    <div className="services-style-one-area default-padding bg-gray half-bg-theme">
      <div className="container">
        <div className="heading-left">
          <div className="row">
            <div className="col-lg-5">
              <div className="left-info">
                <h5 className="sub-title">What We do</h5>
                <h2 className="title">Services Offered</h2>
              </div>
            </div>
            <div className="col-lg-6 offset-lg-1">
              <div className="right-info ">
                <p style={{ textAlign: "justify" }}>
                  From registration to market access, our platform brings every essential FPO service together in one
                  place. Generate AI-backed project reports for funding and scheme applications, connect directly with
                  buyers through our market linkage tools, discover government schemes and subsidies you're eligible
                  for, and track your FPO's tier classification — all from a single, easy-to-use dashboard designed to
                  support your growth at every stage.
                </p>
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
              autoplay={true}
              pagination={{ el: ".swiper-pagination", clickable: true }}
              navigation={{ nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }}
              breakpoints={{ 768: { slidesPerView: 2 }, 992: { slidesPerView: 3 }, 1199: { slidesPerView: 4 } }}
              modules={[Navigation, Pagination, Autoplay]}
            >
              {serviceData.map((service) => (
                <SwiperSlide key={service.id}>
                  <div className="services-style-one">
                    <div className="thumb">
                      <img src={`/assets/img/thumb/${service.thumb}`} alt={service.title} />
                    </div>
                    <h5>
                      <Link href={`/service-details/${service.id}`}>{service.title}</Link>
                    </h5>
                    <Link className="btn btn-theme btn-md radius animation" href={`/service-details/${service.id}`}>
                      Discover More
                    </Link>
                    {/* <p>{service.description}</p> */}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;
