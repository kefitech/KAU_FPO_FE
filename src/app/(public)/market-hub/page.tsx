"use client";

import { useCallback, useEffect, useState } from "react";
import { toMediaUrl } from "@/lib/utils/media-url";
import { DetailModal } from "@/components/shared/detail-modal";
import { type MarketHubProduct, marketHubApi } from "@/lib/api/market-hub";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";

const PAGE_SIZE = 12;

function formatAvailability(from: string, until?: string | null): string {
  if (!from) return "";
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const fromDate = new Date(from);
  const fromWithYear = fromDate.toLocaleDateString("en-GB", { ...dateOpts, year: "numeric" });

  if (!until || until === from) {
    return fromWithYear;
  }

  const untilDate = new Date(until);
  const untilWithYear = untilDate.toLocaleDateString("en-GB", { ...dateOpts, year: "numeric" });

  if (fromDate.getFullYear() === untilDate.getFullYear()) {
    const fromShort = fromDate.toLocaleDateString("en-GB", dateOpts);
    return `${fromShort} – ${untilWithYear}`;
  }

  return `${fromWithYear} – ${untilWithYear}`;
}

export default function MarketHubPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<MarketHubProduct[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [descriptionProduct, setDescriptionProduct] = useState<MarketHubProduct | null>(null);
  const [qualityProduct, setQualityProduct] = useState<MarketHubProduct | null>(null);

  const [inquiryProduct, setInquiryProduct] = useState<MarketHubProduct | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "market_hub").then((data) => {
      setT(data.market_hub ?? {});
    });
  }, [locale]);

  const fetchProducts = useCallback(async (pg: number, searchTerm: string, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await marketHubApi.getProducts({
        page: pg,
        page_size: PAGE_SIZE,
        search: searchTerm || undefined,
      });
      setProducts((prev) => (reset ? res.data : [...prev, ...res.data]));
      setHasNext(res.meta.pagination.has_next);
    } catch {
      //
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!locale) return;
    setPage(1);
    fetchProducts(1, search, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, fetchProducts, search]);

  // Auto-reset to full list the moment the search box is cleared —
  // don't require the user to press Enter again on an empty box.
  useEffect(() => {
    if (search === "") {
      setPage(1);
      fetchProducts(1, "", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, search, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, search, false);
  };

  const openInquiry = (product: MarketHubProduct) => {
    setInquiryProduct(product);
    setInquiryName("");
    setInquiryEmail("");
    setInquiryPhone("");
    setInquiryMessage("");
    setSubmitSuccess(false);
    setSubmitError("");
    setFieldErrors({});
  };

  const closeInquiry = () => setInquiryProduct(null);


  const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_PATTERN = /^\d{10}$/;

  const validateInquiryForm = () => {
    const errors: { name?: string; email?: string; phone?: string } = {};

    const trimmedName = inquiryName.trim();
    if (!trimmedName) {
      errors.name = t.err_name_required ?? "Name is required";
    } else if (trimmedName.length > 100) {
      errors.name = t.err_name_too_long ?? "Name must be under 100 characters";
    } else if (!NAME_PATTERN.test(trimmedName)) {
      errors.name = t.err_name_invalid ?? "Name must contain only letters, spaces, apostrophes, or hyphens";
    }

    const trimmedEmail = inquiryEmail.trim();
    if (!trimmedEmail) {
      errors.email = t.err_email_required ?? "Email is required";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = t.err_email_invalid ?? "Enter a valid email address";
    }

    const trimmedPhone = inquiryPhone.trim();
    if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
      errors.phone = t.err_phone_invalid ?? "Enter a valid 10-digit phone number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryProduct) return;
    if (!validateInquiryForm()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await marketHubApi.inquire(inquiryProduct.id, {
        name: inquiryName.trim(),
        email: inquiryEmail.trim(),
        phone: inquiryPhone.trim() || undefined,
        message: inquiryMessage || undefined,
      });
      setSubmitSuccess(true);
    } catch {
      setSubmitError(t.error_submit ?? "Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const productName = (p: MarketHubProduct) => (locale === "ml" ? p.name.ml || p.name.en : p.name.en);
  const productDesc = (p: MarketHubProduct) =>
    locale === "ml" ? p.description.ml || p.description.en : p.description.en;

  return (
    <AgrulLayout>
      <BreadCrumb title={t.page_title ?? "Market Hub"} breadCrumb={t.breadcrumb ?? "Market Hub"} />
      <div className="products-area default-padding">
        <div className="container">
          {/* Search */}
          <div className="row mb-30">
            <div className="offset-lg-2 col-lg-8">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t.search_placeholder ?? "Search products..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </form>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-success" role="status" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center" style={{ color: "#888" }}>
              {t.empty_state ?? "No products found"}
              {search ? ` for "${search}"` : ""}.
            </p>
          ) : (
            <div className="row">
              {products.map((product) => {
                const imageUrl = toMediaUrl(product.image);
                return (
                  <div className="col-lg-4 col-md-6 mb-30" key={product.id}>
                    <div
                      className="single-item"
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        overflow: "hidden",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {imageUrl ? (
                        // biome-ignore lint/performance/noImgElement: product photo URL is dynamic, not a static asset
                        <img
                          src={imageUrl}
                          alt={productName(product)}
                          style={{ width: "100%", height: 160, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: 160,
                            flexShrink: 0,
                            background: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#bbb",
                            fontSize: 13,
                          }}
                        >
                          {t.no_image ?? "No image"}
                        </div>
                      )}
                      <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                        <div className="d-flex justify-content-between mb-10 align-items-start">
                          <h5
                            className="mb-0"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "70%",
                            }}
                          >
                            {productName(product)}
                          </h5>
                          <span
                            className="badge"
                            style={{ background: "var(--color-primary)", color: "#fff", padding: "4px 10px" }}
                          >
                            {product.commodity_name}
                          </span>
                        </div>
                        {productDesc(product) && (
                          <>
                            <p
                              style={{
                                color: "#666",
                                fontSize: 14,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {productDesc(product)}
                            </p>
                            {productDesc(product).length > 120 && (
                              <button
                                type="button"
                                onClick={() => setDescriptionProduct(product)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  marginTop: -4,
                                  marginBottom: 10,
                                  color: "var(--color-primary)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  alignSelf: "flex-start",
                                }}
                              >
                                {t.btn_read_more ?? "Read more"}
                              </button>
                            )}
                          </>
                        )}
                        <div className="row mb-10">
                          <div className="col-6">
                            <small style={{ color: "#888" }}>{t.label_quantity ?? "Quantity"}</small>
                            <p className="mb-0">
                              {product.quantity} {product.unit}
                            </p>
                          </div>
                          <div className="col-6">
                            <small style={{ color: "#888" }}>{t.label_price ?? "Price"}</small>
                            <p className="mb-0">₹{product.price_per_unit}</p>
                          </div>
                        </div>
                        {product.quality_certification && (
                          <div style={{ marginBottom: 10 }}>
                            <span
                              className="badge"
                              style={{
                                background: "#f0f0f0",
                                color: "#333",
                                padding: "4px 10px",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                              }}
                            >
                              {product.quality_certification}
                            </span>
                            {product.quality_certification.length > 30 && (
                              <button
                                type="button"
                                onClick={() => setQualityProduct(product)}
                                style={{
                                  display: "block",
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  marginTop: 4,
                                  color: "var(--color-primary)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {t.btn_read_more ?? "Read more"}
                              </button>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>
                          {t.label_available ?? "Available"}: {formatAvailability(product.available_from, product.available_until)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-theme secondary btn-sm radius animation mt-15"
                          style={{ marginTop: "auto", alignSelf: "flex-start" }}
                          onClick={() => openInquiry(product)}
                        >
                          {t.btn_inquire ?? "Inquire"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {!search && hasNext && !loading && (
            <div className="mt-40 text-center">
              <button
                type="button"
                className="btn btn-theme secondary btn-md radius animation"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (t.btn_loading ?? "Loading...") : (t.btn_load_more ?? "Load More")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryProduct && (
        // biome-ignore lint/a11y/useSemanticElements: can't be a <button> — it wraps the modal's own <button> elements, which is invalid HTML
        // biome-ignore lint/a11y/noStaticElementInteractions: click-to-close backdrop; keyboard users close via the visible Cancel/Close buttons inside the modal
        <div
          className="modal-backdrop-custom"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
          onClick={closeInquiry}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stops the close-on-backdrop-click from firing when clicking inside the modal content */}
          <div
            role="dialog"
            aria-modal="true"
            style={{ background: "#fff", borderRadius: 8, padding: 30, maxWidth: 500, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {submitSuccess ? (
              <div className="text-center">
                <h5>{t.inquiry_sent_title ?? "Inquiry Sent!"}</h5>
                <p style={{ color: "#666" }}>
                  {(
                    t.inquiry_sent_desc ??
                    'Your inquiry about "{product}" has been sent. The FPO will contact you soon.'
                  ).replace("{product}", productName(inquiryProduct))}
                </p>
                <button type="button" className="btn btn-theme secondary btn-sm radius" onClick={closeInquiry}>
                  {t.btn_close ?? "Close"}
                </button>
              </div>
            ) : (
              <>
                <h5 className="mb-20">
                  {t.modal_title ?? "Inquire about"} {productName(inquiryProduct)}
                </h5>
                <form onSubmit={handleInquirySubmit}>
                  <div className="mb-15">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t.field_name ?? "Your Name"}
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                    />
                    {fieldErrors.name && <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{fieldErrors.name}</p>}
                  </div>
                  <div className="mb-15">
                    <input
                      type="email"
                      className="form-control"
                      placeholder={t.field_email ?? "Your Email"}
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                    />
                    {fieldErrors.email && <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{fieldErrors.email}</p>}
                  </div>
                  <div className="mb-15">
                    <input
                      type="tel"
                      className="form-control"
                      placeholder={t.field_phone ?? "Your Phone (optional)"}
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    /> 
                    {fieldErrors.phone && <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{fieldErrors.phone}</p>}
                  </div>
                  <div className="mb-15">
                    <textarea
                      className="form-control"
                      placeholder={t.field_message ?? "Message (optional)"}
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                    />
                  </div>
                  {submitError && <p style={{ color: "red", fontSize: 13 }}>{submitError}</p>}
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-theme secondary btn-sm radius animation"
                      disabled={submitting}
                    >
                      {submitting ? (t.btn_submitting ?? "Submitting...") : (t.btn_submit ?? "Submit Inquiry")}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={closeInquiry}>
                      {t.btn_cancel ?? "Cancel"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      <DetailModal
        open={!!descriptionProduct}
        onClose={() => setDescriptionProduct(null)}
        title={t.description_label ?? "Description"}
      >
        <p style={{ color: "#666", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {descriptionProduct ? productDesc(descriptionProduct) : ""}
        </p>
      </DetailModal>
      <DetailModal
        open={!!qualityProduct}
        onClose={() => setQualityProduct(null)}
        title={t.quality_label ?? "Quality Certification"}
      >
        <p style={{ color: "#666", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {qualityProduct?.quality_certification}
        </p>
      </DetailModal>
    </AgrulLayout>
  );
}
