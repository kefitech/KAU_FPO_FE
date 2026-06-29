"use client";
import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { serviceData } from "../../_data/services";

const faqItems = [
  { id: "one", q: "What do you add to the soil before you plant a crop?", a: "Bennings appetite disposed me an at subjects an. To no indulgence diminution so discovered mr apartments. Are off under folly death wrote cause her way spite. Plan upon yet way get cold spot its week. therefore always holds in these matters to this principle of selection." },
  { id: "two", q: "Do you use herbicides?", a: "Cennings appetite disposed me an at subjects an. To no indulgence diminution so discovered mr apartments. Are off under folly death wrote cause her way spite. Plan upon yet way get cold spot its week." },
  { id: "three", q: "Where does the water come from that you use on your crops?", a: "Tennings appetite disposed me an at subjects an. To no indulgence diminution so discovered mr apartments. Are off under folly death wrote cause her way spite. Plan upon yet way get cold spot its week." },
];

function ServiceFaq() {
  const [open, setOpen] = useState("one");
  return (
    <div className="common-faq mt-40">
      <h3 className="mb-20">We're Here to Help You</h3>
      <div className="accordion accordion-regular" id="faqAccordion">
        {faqItems.map((faq) => (
          <div className="accordion-item" key={faq.id}>
            <h2 className="accordion-header">
              <button
                className={`accordion-button${open === faq.id ? "" : " collapsed"}`}
                type="button"
                onClick={() => setOpen(open === faq.id ? "" : faq.id)}
              >
                {faq.q}
              </button>
            </h2>
            <div
              className={`accordion-collapse collapse${open === faq.id ? " show" : ""}`}
            >
              <div className="accordion-body"><p>{faq.a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = serviceData.find((s) => s.id === parseInt(id));
  if (!service) notFound();

  return (
    <AgrulLayout>
      <BreadCrumb title="Service Details" breadCrumb="Service Details" />
      <div className="services-details-area default-padding">
        <div className="container">
          <div className="services-details-items">
            <div className="row">
              <div className="col-xl-8 col-lg-7 pl-45 pl-md-15 pl-xs-15 services-single-content order-lg-last">
                <div className="thumb">
                  <img src={`/assets/img/banner/${service.id === 1 ? "6" : service.id === 2 ? "7" : service.id === 3 ? "8" : service.id === 4 ? "9" : "10"}.jpg`} alt={service.title} />
                </div>
                <h2>{service.title}</h2>
                <p>
                  We denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment, so blinded by desire, that they cannot foresee the pain and trouble that are bound to ensue. These cases are perfectly simple and easy to distinguish. In a free hour, when our power of choice is untrammelled data structures manages data in technology.
                </p>
                <div className="features mt-40 mt-xs-30 mb-30 mb-xs-20">
                  <div className="row">
                    <div className="col-lg-5 col-md-6">
                      <div className="content">
                        <h3>Services offered</h3>
                        <ul className="feature-list-item">
                          <li>Agriculture Consulting</li>
                          <li>Custom farming rules</li>
                          <li>Real-time rate shopping</li>
                          <li>100 freight shipments / month</li>
                        </ul>
                      </div>
                    </div>
                    <div className="col-lg-7 col-md-6 mt-xs-30">
                      <div className="content">
                        <h3>The Challange</h3>
                        <p>
                          Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <h3>What we do?</h3>
                <p>
                  Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.
                </p>
                <ServiceFaq />
              </div>
              <div className="col-xl-4 col-lg-5 mt-md-50 mt-xs-50 services-sidebar">
                <div className="single-widget services-list-widget">
                  <div className="content">
                    <ul>
                      {serviceData.map((s) => (
                        <li key={s.id} className={s.id === service.id ? "current-item" : ""}>
                          <Link href={`/service-details/${s.id}`}>{s.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="single-widget quick-contact-widget text-light" style={{ backgroundImage: "url(/assets/img/thumbs/5.jpg)" }}>
                  <div className="content">
                    <h3>Need Help?</h3>
                    <p>
                      Speak with a human to filling out a form? call corporate office and we will connect you with a team member help.
                    </p>
                    <h2>+(012) 6679545</h2>
                    <h4><a href="mailto:info@agrul.com">info@agrul.com</a></h4>
                    <Link className="btn mt-30 circle btn-theme animation btn-md" href="/contact-us">Contact Us</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
