"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import CountUp from "react-countup";
import { faqApi, type Faq } from "@/lib/api/faq";
import { useLocaleStore } from "@/stores/locale-store";

const WhyChoose = () => {
  const [faqItems, setFaqItems] = useState<Faq[]>([]);
  const [openItem, setOpenItem] = useState<number | null>(null);
  const locale = useLocaleStore((s) => s.locale);
  const toggle = (id: number) => setOpenItem(openItem === id ? null : id);

  useEffect(() => {
    faqApi.getAll({ page: 1, page_size: 3 }).then((res) => {
      setFaqItems(res.data);
      if (res.data.length > 0) setOpenItem(res.data[0].id);
    }).catch(() => {});
  }, [locale]);

  return (
    <div className="choose-us-style-one-area overflow-hidden default-padding">
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-6 choose-us-style-one">
            <div className="thumb">
              <img src="/assets/img/about/1.jpg" alt="About" />
              <div className="shape">
                <img src="/assets/img/shape/22.png" alt="shape" data-aos="fade-down" data-aos-delay="100" />
              </div>
              <div className="product-produce">
                <div className="icon"><i className="flaticon-farmer" /></div>
                <div className="fun-fact">
                  <div className="counter">
                    <div className="timer"><CountUp end={258} enableScrollSpy scrollSpyOnce /></div>
                    <div className="operator">K</div>
                  </div>
                  <span className="medium">Agriculture, Organic Products</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6 choose-us-style-one">
            <h5 className="sub-title">Get to know us</h5>
            <h2 className="title">Agriculture matters to <br /> the future of development</h2>
            <div className="accordion accordion-regular mt-35" id="faqAccordion">
              {faqItems.map((item) => (
                <div key={item.id} className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button${openItem === item.id ? "" : " collapsed"}`}
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={openItem === item.id}
                    >
                      {item.question}
                    </button>
                  </h2>
                  <div className={`accordion-collapse collapse${openItem === item.id ? " show" : ""}`}>
                    <div className="accordion-body"><p>{item.answer}</p></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-30">
              <Link className="btn btn-theme secondary btn-md radius animation" href="/faq">
                View All FAQs <i className="fas fa-arrow-right ms-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyChoose;
