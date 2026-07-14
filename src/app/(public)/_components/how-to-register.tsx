"use client";

import { useEffect, useState } from "react";

import { publicFetch } from "../_lib/public-fetch";

interface AboutData {
  about_body: string;
  about_title: string;
  hero_description: string;
  hero_headline: string;
  hero_subheading: string;
  how_to_register: string;
}

interface ParsedBlock {
  type: "phase" | "step" | "text" | "break";
  text: string;
  innerHTML?: string;
}

function parseContent(raw: string): ParsedBlock[] {
  if (!raw) return [];

  const looksLikeHtml = /<p[\s>]/i.test(raw);

  if (looksLikeHtml) {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    return Array.from(doc.querySelectorAll("p")).map((p) => {
      const text = p.textContent?.trim() ?? "";
      return classify(text, p.innerHTML);
    });
  }

  // Plain text with \n separators
  return raw
    .split("\n")
    .map((line) => classify(line.trim(), line.trim()));
}

function classify(text: string, innerHTML: string): ParsedBlock {
  if (/^PHASE\s+[IVX]+:/i.test(text)) {
    return { type: "phase", text };
  }
  if (/^STEP\s+\d+/i.test(text)) {
    // normalize "Step 1 — Title" or "STEP 1: Title" into one display string
    const cleaned = text.replace(/^STEP\s+(\d+)\s*[—:-]\s*/i, "Step $1 — ");
    return { type: "step", text: cleaned };
  }
  if (text === "") {
    return { type: "break", text: "" };
  }
  return { type: "text", text, innerHTML };
}

export default function HowToRegister() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/site-content/`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json.data ?? null))
      .catch((err) => {
        console.error(err);
        setError("Unable to load page content. Please try again shortly.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center">Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {error ?? "Content is currently unavailable."}
      </div>
    );
  }

  const blocks = parseContent(data.how_to_register ?? "");

  return (
    <div className="default-padding">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h2 className="title">How to Register</h2>
              <div className="devider" />
            </div>

            <div style={{ lineHeight: 1.9 }}>
              {blocks.map((block, i) => {
                if (block.type === "phase") {
                  return (
                    <h4
                      key={i}
                      style={{
                        fontWeight: 800,
                        color: "var(--color-heading)",
                        marginTop: 32,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {block.text}
                    </h4>
                  );
                }

                if (block.type === "step") {
                  return (
                    <p
                      key={i}
                      style={{
                        fontWeight: 700,
                        color: "var(--color-heading)",
                        marginTop: 16,
                        marginBottom: 2,
                      }}
                    >
                      {block.text}
                    </p>
                  );
                }

                if (block.type === "break") {
                  return <br key={i} />;
                }

                return block.innerHTML ? (
                  <p
                    key={i}
                    style={{ margin: "2px 0", color: "var(--color-paragraph)" }}
                    dangerouslySetInnerHTML={{ __html: block.innerHTML }}
                  />
                ) : (
                  <p key={i} style={{ margin: "2px 0", color: "var(--color-paragraph)" }}>
                    {block.text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}