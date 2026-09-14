"use client";

import { useCallback, useEffect, useState } from "react";

import { type MarketHubProduct, marketHubApi } from "@/lib/api/market-hub";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";

const PAGE_SIZE = 12;

export default function MarketHubPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<MarketHubProduct[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Inquiry modal state
  const [inquiryProduct, setInquiryProduct] = useState<MarketHubProduct | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
  };

  const closeInquiry = () => setInquiryProduct(null);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryProduct) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await marketHubApi.inquire(inquiryProduct.id, {
        name: inquiryName,
        email: inquiryEmail,
        phone: inquiryPhone || undefined,
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
              {products.map((product) => (
                <div className="col-lg-4 col-md-6 mb-30" key={product.id}>
                  <div className="single-item" style={{ border: "1px solid #eee", borderRadius: 8, padding: 20 }}>
                    <div className="d-flex justify-content-between mb-10 align-items-start">
                      <h5 className="mb-0">{productName(product)}</h5>
                      <span
                        className="badge"
                        style={{ background: "var(--color-primary)", color: "#fff", padding: "4px 10px" }}
                      >
                        {product.commodity_code}
                      </span>
                    </div>
                    {productDesc(product) && <p style={{ color: "#666", fontSize: 14 }}>{productDesc(product)}</p>}
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
                      <span
                        className="badge"
                        style={{ background: "#f0f0f0", color: "#333", padding: "4px 10px", marginBottom: 10 }}
                      >
                        {product.quality_certification}
                      </span>
                    )}
                    <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>
                      {t.label_available ?? "Available"}: {product.available_from}
                      {product.available_until ? ` – ${product.available_until}` : ""}
                    </div>
                    <button
                      type="button"
                      className="btn btn-theme secondary btn-sm radius animation mt-15"
                      onClick={() => openInquiry(product)}
                    >
                      {t.btn_inquire ?? "Inquire"}
                    </button>
                  </div>
                </div>
              ))}
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
                  </div>
                  <div className="mb-15">
                    <input
                      type="tel"
                      className="form-control"
                      placeholder={t.field_phone ?? "Your Phone (optional)"}
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                    />
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
    </AgrulLayout>
  );
}