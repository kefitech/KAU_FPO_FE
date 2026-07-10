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

export default function HowToRegister() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/site-content/`)
      .then((res) => res.json())
      .then((json) => setData(json.data))
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

  return (
    <div className="default-padding">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h2 className="title">How to Register</h2>
              <div className="devider" />
            </div>

            <div style={{ whiteSpace: "pre-line", lineHeight: 1.9 }}>
              {(data.how_to_register ?? "").split("\n").map((line, i) => {
                // Phase headings like "PHASE I: ..."
                if (/^PHASE\s+[IVX]+:/i.test(line.trim())) {
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
                      {line.trim()}
                    </h4>
                  );
                }

                // Step lines like "Step 1 — ..."
                if (/^Step\s+\d+/i.test(line.trim())) {
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
                      {line.trim()}
                    </p>
                  );
                }

                // Empty lines
                if (line.trim() === "") {
                  return <br key={i} />;
                }

                // Regular paragraph lines
                return (
                  <p key={i} style={{ margin: "2px 0", color: "var(--color-paragraph)" }}>
                    {line}
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
