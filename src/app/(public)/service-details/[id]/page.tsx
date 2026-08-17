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

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  credit: "bg-primary",
  insurance: "bg-info text-dark",
  marketing: "bg-success",
  infrastructure: "bg-warning text-dark",
  capacity_building: "bg-secondary",
};

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
      <BreadCrumb title="Service Details" breadCrumb="Service Details" />
      <div className="services-details-area default-padding">
        <div className="container">
          <div className="services-details-items">
            <div className="row">
              <div className="col-xl-8 col-lg-7 pl-45 pl-md-15 pl-xs-15 services-single-content order-lg-last">
                <div className="thumb">
                  <img src={`/assets/img/banner/services.png`} alt={service.title} />
                </div>
                <h2>{service.title}</h2>
                <p>{service.description}</p>

                {service.id === 4 && <ServiceSchemes />}
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
                <div className="single-widget quick-contact-widget text-light" style={{ backgroundImage: "url(/assets/img/thumbs/contact.png)" }}>
                  <div className="content">
                    <h3>Need Help?</h3>
                    <p>
                      Call office and we will connect you with a team member help.
                    </p>
                    <h2>+91-487-2370150 <br />+91-487-2370086 </h2>
                    <h4><a href="mailto:de@kau.in">de@kau.in</a></h4>
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