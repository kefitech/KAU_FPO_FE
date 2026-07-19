"use client";
import { useState, useEffect, useCallback } from "react";
import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import { faqApi, type Faq } from "@/lib/api/faq";
import { Color } from "@tiptap/extension-text-style";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "FPO General", value: "fpo_general" },
  { label: "Schemes", value: "schemes" },
  { label: "Platform Usage", value: "platform_usage" },
];

const PAGE_SIZE = 10;

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFaqs = useCallback(async (pg: number, cat: string, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await faqApi.getAll({ page: pg, page_size: PAGE_SIZE, category: cat || undefined });
      setFaqs((prev) => reset ? res.data : [...prev, ...res.data]);
      setHasNext(res.meta.pagination.has_next);
    } catch {
      //
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setOpen(null);
    fetchFaqs(1, category, true);
  }, [category, fetchFaqs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFaqs(nextPage, category, false);
  };

  const filtered = search.trim()
    ? faqs.filter((f) => f.question.toLowerCase().includes(search.toLowerCase()))
    : faqs;

  return (
    <AgrulLayout>
      <BreadCrumb title="FAQ" breadCrumb="FAQ" />
      <div className="faq-area default-padding">
        <div className="container">
          <div className="row">
            <div className="col-lg-10 offset-lg-1">

              {/* Search */}
              <div className="mb-30">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search FAQs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Category tabs */}
              <ul className="nav nav-pills mb-35" style={{ gap: "8px" }}>
                {CATEGORIES.map((cat) => (
                  <li className="nav-item" key={cat.value}>
                    <button
                      type="button"
                      className={`nav-link${category === cat.value ? " active" : ""}`}
                      
                      onClick={() => setCategory(cat.value)}
                      style={
                        category === cat.value ? {
                          backgroundColor: "var(--color-primary)",
                          borderColor: "var(--color-primary)",
                          color: "#fff" 
                        }
                        :{
                          color: "var(--color-primary)"
                        }
                      }
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Accordion */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center" style={{ color: "#888" }}>
                  No FAQs found{search ? ` for "${search}"` : ""}.
                </p>
              ) : (
                <div className="accordion accordion-regular" id="faqAccordion">
                  {filtered.map((faq) => (
                    <div className="accordion-item" key={faq.id}>
                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button${open === faq.id ? "" : " collapsed"}`}
                          type="button"
                          onClick={() => setOpen(open === faq.id ? null : faq.id)}
                        >
                          {faq.question}
                        </button>
                      </h2>
                      <div className={`accordion-collapse collapse${open === faq.id ? " show" : ""}`}>
                        <div className="accordion-body">
                          <p>{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Load More */}
              {!search && hasNext && !loading && (
                <div className="text-center mt-40">
                  <button
                    type="button"
                    className="btn btn-theme secondary btn-md radius animation"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
