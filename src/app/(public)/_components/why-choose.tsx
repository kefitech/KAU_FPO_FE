"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import DOMPurify from "isomorphic-dompurify";
import CountUp from "react-countup";

import { type Faq, faqApi } from "@/lib/api/faq";
import { useLocaleStore } from "@/stores/locale-store";

const WhyChoose = () => {
  const [faqItems, setFaqItems] = useState<Faq[]>([]);
  const [openItem, setOpenItem] = useState<number | null>(null);
  const locale = useLocaleStore((s) => s.locale);
  const [totalCount, setTotalCount] = useState<number>(0);
  const toggle = (id: number) => setOpenItem(openItem === id ? null : id);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch intentionally triggered on locale change
  useEffect(() => {
    if(!locale) return;
    faqApi
      .getAll({ page: 1, page_size: 3 })
      .then((res) => {
        setFaqItems(res.data);
        if (res.data.length > 0) setOpenItem(res.data[0].id);
        setTotalCount(res?.meta?.pagination?.total_count?? 0);
      })
      .catch(() => {
        // silently ignore FAQ fetch errors; section just won't render
      });
  }, [locale]);

  return (
    <div className="choose-us-style-one-area overflow-hidden default-padding">
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-6 choose-us-style-one">
            <div className="thumb">
              <img src="/assets/img/faq/1.jpeg" alt="About" />
              <div className="shape">
                <img src="/assets/img/shape/22.png" alt="shape" data-aos="fade-down" data-aos-delay="100" />
              </div>
              <div className="product-produce">
                <div className="icon">
                  <i className="flaticon-farmer" />
                </div>
                <div className="fun-fact">
                  <div className="counter">
                    <div className="timer">
                      <CountUp end={totalCount} enableScrollSpy scrollSpyOnce />
                    </div>
                    <div className="operator"> FAQs</div>
                  </div>
                  <span className="medium">Have query? Check FAQ</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6 choose-us-style-one">
            <h5 className="sub-title">Get to know us</h5>
            <h2 className="title">
              Agriculture matters to <br /> the future of development
            </h2>
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
                    <div className="accordion-body">
                      <div
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.answer) }}
                      />
                    </div>
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
