"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound,useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { serviceData } from "../../_data/services";
import { schemesApi } from "@/lib/api/schemes";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import {
  SCHEME_CATEGORIES,
  CATEGORY_LABEL_KEYS,
  type T,
} from "@/components/schemes/scheme-card";
import type { FpoScheme } from "@/types/fpo";
import styles from "./scheme-card.module.css";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";


const CATEGORY_BADGE_CLASS: Record<string, string> = {
  credit: "bg-primary",
  insurance: "bg-info text-dark",
  marketing: "bg-success",
  infrastructure: "bg-warning text-dark",
  capacity_building: "bg-secondary",
};

function ServiceThumb({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasErrored, setHasErrored] = useState(false);

  return (
    <img
      src={imgSrc}
      alt={alt}
      style={{ width: "100%", height: 140, objectFit: "contain", marginBottom: 12 }}
      onError={() => {
        if (!hasErrored) {
          setHasErrored(true);
          setImgSrc("/assets/img/thumb/default.png");
        }
      }}
    />
  );
}

function ServiceSchemes() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const schemeCategories = SCHEME_CATEGORIES.filter((c) => c !== "");
  const [activeCategory, setActiveCategory] = useState(schemeCategories[0]);
  const [selectedScheme, setSelectedScheme] = useState<FpoScheme | null>(null);

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_schemes,common")
      .then((data) => setT(data.fpo_schemes ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["fpo-schemes", locale, activeCategory],
    queryFn: () =>
      schemesApi.list({
        locale,
        category: activeCategory,
      }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="service-schemes mt-40">
      <h3 className="mb-20">Related Government Schemes</h3>
        <ul className={`nav nav-pills ${styles.filterList}`}>
        {schemeCategories.map((catValue) => (
          <li className="nav-item" key={catValue}>
            <button
              type="button"
              className={`${styles.filterPill} ${activeCategory === catValue ? styles.filterPillActive : styles.filterPillInactive}`}
              onClick={() => setActiveCategory(catValue)}
            >
              {t[CATEGORY_LABEL_KEYS[catValue].key] ?? CATEGORY_LABEL_KEYS[catValue].fallback}
            </button>
          </li>
        ))}
      </ul>

      {isLoading ? (
        <div className="row g-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <div className="col-md-6" key={i}>
              <div className="card h-100 p-4 placeholder-glow">
                <span className="placeholder col-4 mb-3" />
                <span className="placeholder col-8 mb-2" />
                <span className="placeholder col-12 mb-2" />
                <span className="placeholder col-6" />
              </div>
            </div>
          ))}
        </div>
      ) : !schemes || schemes.length === 0 ? (
        <p className="text-muted">No schemes available in this category.</p>
      ) : (
        <div className={`row g-4 ${styles.schemesGrid}`}>
          {schemes.map((scheme) => (
            <div className="col-md-6" key={scheme.id}>
              <div className={`card h-100 p-4 d-flex flex-column gap-2 ${styles.schemeHoverCard}`}>
                <span className={`badge ${CATEGORY_BADGE_CLASS[scheme.category] ?? "bg-light text-dark"} align-self-start`}>
                  {scheme.category_display}
                </span>
                <h5 className="mb-1">{scheme.name}</h5>
                {scheme.administering_body && (
                  <p className="small text-muted mb-1">
                    <strong>Administered by:</strong> {scheme.administering_body}
                  </p>
                )}
                {scheme.eligibility && (
                  <p className="small mb-1">
                    <strong>Eligibility:</strong> {scheme.eligibility}
                  </p>
                )}
                <div className="mt-auto pt-2 d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setSelectedScheme(scheme)}>
                    View Details
                  </button>
                  {scheme.official_link && (
                    <a className="btn btn-sm btn-theme" href={scheme.official_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="me-1" size={14} /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedScheme && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setSelectedScheme(null)} />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{selectedScheme.name}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedScheme(null)} />
                </div>
                <div className="modal-body">
                  <p><strong>Category:</strong> {selectedScheme.category_display}</p>
                  {selectedScheme.administering_body && <p><strong>Administered By:</strong> {selectedScheme.administering_body}</p>}
                  {selectedScheme.objective && <p><strong>Objective:</strong> {selectedScheme.objective}</p>}
                  {selectedScheme.eligibility && <p><strong>Eligibility:</strong> {selectedScheme.eligibility}</p>}
                  {selectedScheme.benefit_details && <p><strong>Benefits:</strong> {selectedScheme.benefit_details}</p>}
                  {selectedScheme.application_process && <p><strong>How to Apply:</strong> {selectedScheme.application_process}</p>}
                  {selectedScheme.last_updated && <p><strong>Last Updated:</strong> {selectedScheme.last_updated}</p>}
                </div>
                <div className="modal-footer">
                  {selectedScheme.official_link && (
                    <a className="btn btn-theme" href={selectedScheme.official_link} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  )}
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedScheme(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default function ServiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const service = serviceData.find((s) => s.id === parseInt(id as string));
  if (!service) notFound();

  return (
    <AgrulLayout>
      <BreadCrumb title={service.title} breadCrumb={service.title} />
      <div className="services-details-area default-padding">
        <div className="container">
          {/* Service cards carousel */}
          <div style={{ marginBottom: 40, minHeight: 360 }}>
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              style={{ paddingBottom: 40 }}
              spaceBetween={16}
              slidesPerView={4}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              breakpoints={{
                0: { slidesPerView: 1 },
                576: { slidesPerView: 2 },
                992: { slidesPerView: 3 },
                1200: { slidesPerView: 4 },
              }}
            >
              {serviceData.map((s) => (
                <SwiperSlide key={s.id}>
                  <div
                    style={{
                      background: "#fff",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                      padding: 16,
                      borderRadius: 4,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 320,
                    }}
                    className={s.id === service.id ? "current-item" : ""}
                  >
                    <ServiceThumb src={`/assets/img/thumb/${s.thumb}`} alt={s.title} />
                    <h4 style={{ marginBottom: 12, fontSize: 15, width: "100%" }}>{s.title}</h4>
                    <Link href={`/service-details/${s.id}`} className="btn btn-theme" style={{ margin: "0 auto" }}>
                      Learn More
                    </Link>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <div className="services-details-items">
            <div className="row">
              <div className="col-xl-8 col-lg-7 pl-45 pl-md-15 pl-xs-15 services-single-content order-lg-last">
                <h2>{service.title}</h2>
                <p>{service.description}</p>

                {service.id === 4 && <ServiceSchemes />}
              </div>
              <div className="col-xl-4 col-lg-5 mt-md-50 mt-xs-50 services-sidebar">
                <div
                  className="single-widget quick-contact-widget text-light"
                  style={{ backgroundImage: "url(/assets/img/thumbs/contact.png)" }}
                >
                  <div className="content">
                    <h3>Need Help?</h3>
                    <p>Call office and we will connect you with a team member help.</p>
                    <h2>
                      +91-487-2370150 <br />
                      +91-487-2370086
                    </h2>
                    <h4>
                      <a href="mailto:de@kau.in">de@kau.in</a>
                    </h4>
                    <Link className="btn mt-30 circle btn-theme animation btn-md" href="/contact-us">
                      Contact Us
                    </Link>
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