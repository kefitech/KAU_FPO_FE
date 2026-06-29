"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { testimonialData } from "../_data/testimonials";

const farmerImages = [
  "/assets/img/farmers/1.jpg",
  "/assets/img/farmers/2.jpg",
  "/assets/img/farmers/3.jpg",
  "/assets/img/farmers/4.jpg",
];

const Testimonial = () => {
  return (
    <div className="testimonials-area default-padding bg-gray" style={{ backgroundImage: "url(/assets/img/shape/23.png)" }}>
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-5">
            <div className="testimonial-info text-center">
              <h4>Testimonial</h4>
              <div className="thumb">
                {farmerImages.map((src, i) => (
                  <img key={i} src={src} alt={`Farmer ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-6 offset-lg-1">
            <Swiper
              className="testimonial-carousel testimonial-style-one"
              direction="horizontal"
              loop={true}
              autoplay={true}
              modules={[Autoplay]}
            >
              {testimonialData.map((item) => (
                <SwiperSlide key={item.id}>
                  <div className="testimonial-style-two">
                    <div className="item">
                      <div className="content"><p>&ldquo;{item.quote}&rdquo;</p></div>
                      <div className="provider">
                        <div className="info">
                          <h4>{item.name}</h4>
                          <span>{item.designation}</span>
                        </div>
                      </div>
                    </div>
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

export default Testimonial;
