"use client";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import { serviceData } from "../_data/services";

const Services = () => {
  return (
    <div className="services-style-one-area default-padding bg-gray half-bg-theme">
      <div className="container">
        <div className="heading-left">
          <div className="row">
            <div className="col-lg-5">
              <div className="left-info">
                <h5 className="sub-title">What we do</h5>
                <h2 className="title">Currently we are <br /> selling organic food</h2>
              </div>
            </div>
            <div className="col-lg-6 offset-lg-1">
              <div className="right-info">
                <p>
                  Everything melancholy uncommonly but solicitude inhabiting projection off.
                  Connection stimulated estimating excellence an to impression. ladies she
                  basket season age her uneasy saw. Discourse unwilling am no described.
                </p>
                <Link className="btn btn-theme btn-md radius animation" href="/services">Discover More</Link>
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
                    <h5><Link href={`/service-details/${service.id}`}>{service.title}</Link></h5>
                    <p>{service.description}</p>
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
