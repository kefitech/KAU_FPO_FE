"use client";

import { useState } from "react";
import Image from "next/image";

const FAQS = [
  {
    id: "one",
    q: "What is a Farmer Producer Organization (FPO)?",
    a: "An FPO is a legal entity formed by primary producers like farmers. It helps members access better inputs, technology, credit and markets. KAU supports FPOs across all 14 Kerala districts through this programme.",
  },
  {
    id: "two",
    q: "How do I register my FPO on this platform?",
    a: "Click 'Register FPO' on the top navigation. Fill the multi-step registration form with your FPO details, upload required documents, and submit for review. Approval is typically within 3–5 working days.",
  },
  {
    id: "three",
    q: "What services does the platform provide after registration?",
    a: "After registration you get access to AI-based crop advisory, expert consultancy, government scheme applications, market linkage (ONDC, FarmerConnect), GIS mapping tools, and bilingual (English/Malayalam) support.",
  },
];

export function WhyChooseSection() {
  const [open, setOpen] = useState<string>("one");

  return (
    <div className="choose-us-style-one-area overflow-hidden default-padding">
      <div className="container">
        <div className="row align-center">
          {/* Left: Image with overlay stat */}
          <div className="col-lg-6 choose-us-style-one">
            <div className="thumb">
              <Image
                src="/images/agrul/about/2.jpg"
                alt="Farmers"
                width={550}
                height={680}
              />
              <div className="shape">
                <Image
                  src="/images/agrul/shape/22.png"
                  alt="shape"
                  width={100}
                  height={100}
                />
              </div>
              <div className="product-produce">
                <div className="icon">
                  <i className="flaticon-farmer" />
                </div>
                <div className="fun-fact">
                  <div className="counter">
                    <div className="timer">500K</div>
                  </div>
                  <span className="medium">Farmers Empowered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: FAQ Accordion */}
          <div className="col-lg-6 choose-us-style-one">
            <h5 className="sub-title">Get To Know Us</h5>
            <h2 className="title">
              KAU-FPO matters to <br /> the future of farming
            </h2>

            <div className="accordion accordion-regular mt-35" id="faqAccordion">
              {FAQS.map((faq) => (
                <div key={faq.id} className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      type="button"
                      className={`accordion-button${open !== faq.id ? " collapsed" : ""}`}
                      onClick={() => setOpen(open === faq.id ? "" : faq.id)}
                    >
                      {faq.q}
                    </button>
                  </h2>
                  <div
                    className={`accordion-collapse collapse${open === faq.id ? " show" : ""}`}
                  >
                    <div className="accordion-body">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
