"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: number;
  title: string;
  file_url: string;
  is_view_only: boolean;
  order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(url: string): { icon: string; color: string } {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf")                          return { icon: "fas fa-file-pdf",        color: "#e53935" };
  if (["xls", "xlsx", "csv"].includes(ext ?? "")) return { icon: "fas fa-file-excel",  color: "#43a047" };
  if (["doc", "docx"].includes(ext ?? ""))    return { icon: "fas fa-file-word",       color: "#1e88e5" };
  if (["ppt", "pptx"].includes(ext ?? ""))   return { icon: "fas fa-file-powerpoint",  color: "#fb8c00" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext ?? "")) return { icon: "fas fa-file-image", color: "#8e24aa" };
  return { icon: "fas fa-file-alt", color: "#757575" };
}

// ─── Sticky Documents Panel ───────────────────────────────────────────────────

const Documents = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/documents/?page_size=20`)
      .then((r) => r.json())
      .then((json) => setDocs((json.data as Document[]) ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [locale]);

  // Hide completely if no documents and done loading
  if (!loading && docs.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
      }}
      // Hide on small screens via inline media — handled via className below
      className="documents-sticky-panel"
    >
      {/* Collapse tab */}
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        title={collapsed ? "Show Documents" : "Hide Documents"}
        style={{
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "6px 0 0 6px",
          padding: "12px 7px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          writingMode: "vertical-rl",
          alignSelf: "center",
          boxShadow: "-3px 0 12px rgba(0,0,0,0.15)",
        }}
      >
        <i
          className={collapsed ? "fas fa-chevron-left" : "fas fa-chevron-right"}
          style={{ fontSize: 11 }}
        />
        {collapsed && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-default)",
            }}
          >
            Docs
          </span>
        )}
      </button>

      {/* Panel */}
      {!collapsed && (
        <div
          style={{
            background: "#fff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.13)",
            width: 240,
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: "8px 0 0 8px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "var(--color-primary)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <i className="fas fa-folder-open" style={{ color: "#fff", fontSize: 14 }} />
            <span
              style={{
                color: "#fff",
                fontFamily: "var(--font-default)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.03em",
              }}
            >
              Documents
            </span>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flexGrow: 1 }}>
            {loading ? (
              [80, 65, 90, 70].map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f0f0f0", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 12, borderRadius: 4, background: "#f0f0f0", width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              ))
            ) : (
              docs.map((doc) => {
                const { icon, color } = getFileIcon(doc.file_url);
                return (
                  <div
                    key={doc.id}
                    style={{
                      padding: "11px 14px",
                      borderBottom: "1px solid #f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f9f9f9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* File icon */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: `${color}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i className={icon} style={{ fontSize: 14, color }} />
                    </div>

                    {/* Title */}
                    <span
                      style={{
                        fontSize: 12,
                        color: "#444",
                        fontFamily: "var(--font-default)",
                        lineHeight: 1.4,
                        flexGrow: 1,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={doc.title}
                    >
                      {doc.title}
                    </span>

                    {/* Action icons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {/* View */}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 5,
                          background: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                          flexShrink: 0,
                        }}
                      >
                        <i className="fas fa-eye" style={{ fontSize: 11, color: "#fff" }} />
                      </a>

                      {/* Download — only if not view-only */}
                      {!doc.is_view_only && (
                        <a
                          href={doc.file_url}
                          download
                          title="Download"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 5,
                            background: "var(--color-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            flexShrink: 0,
                          }}
                        >
                          <i className="fas fa-download" style={{ fontSize: 11, color: "#fff" }} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
