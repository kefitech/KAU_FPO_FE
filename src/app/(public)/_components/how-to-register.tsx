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

interface Step {
  title: string;
  content: string[]; // paragraph innerHTML strings belonging to this step
}

interface Phase {
  title: string;
  steps: Step[];
}

function parseHowToRegister(raw: string): Phase[] {
  if (!raw) return [];

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const paragraphs = Array.from(doc.querySelectorAll("p"));

  const phases: Phase[] = [];
  let currentPhase: Phase | null = null;
  let currentStep: Step | null = null;

  paragraphs.forEach((p) => {
    const text = p.textContent?.trim() ?? "";

    if (/^PHASE\s+[IVX]+:/i.test(text)) {
      currentPhase = { title: text, steps: [] };
      phases.push(currentPhase);
      currentStep = null;
      return;
    }

    if (/^STEP\s+\d+/i.test(text)) {
      const cleaned = text.replace(/^STEP\s+(\d+)\s*[—:-]\s*/i, "Step $1 — ");
      currentStep = { title: cleaned, content: [] };
      currentPhase?.steps.push(currentStep);
      return;
    }

    if (text === "") return; // empty breaks skipped; spacing now comes from layout

    if (currentStep) {
      currentStep.content.push(p.innerHTML);
    } else if (currentPhase) {
      // paragraph appearing directly under a phase, before any STEP heading
      currentPhase.steps.push({ title: "", content: [p.innerHTML] });
    }
  });

  return phases;
}

export default function HowToRegister() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<number | null>(0);
  const [openStep, setOpenStep] = useState<number | null>(null);

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

  const phases = parseHowToRegister(data.how_to_register ?? "");

  const togglePhase = (i: number) => {
    setOpenPhase(openPhase === i ? null : i);
    setOpenStep(null); // collapse any open step when switching phase
  };

  const toggleStep = (i: number) => {
    setOpenStep(openStep === i ? null : i);
  };

  return (
    <div className="default-padding">
      <div className="container">
        <div className="shape-right-top">
        <img src="/assets/img/shape/leaf.png" alt="leaf shape" />
      </div>
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h2 className="title">How to Register</h2>
              <div className="devider" />
            </div>
            <div style={{ marginTop: 24 }}>
              {phases.map((phase, pIdx) => {
                const isPhaseOpen = openPhase === pIdx;
                return (
                  <div
                    key={pIdx}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      marginBottom: 12,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => togglePhase(pIdx)}
                      aria-expanded={isPhaseOpen}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
                        background: "#f9fafb",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800,
                        color: "var(--dark)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        textAlign: "left",
                      }}
                    >
                      <span>{phase.title}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          transform: isPhaseOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          marginLeft: 12,
                          flexShrink: 0,
                        }}
                      >
                        ▾
                      </span>
                    </button>

                    {isPhaseOpen && (
                      <div style={{ padding: "8px 18px 16px" }}>
                        {phase.steps.map((step, sIdx) => {
                          const isStepOpen = openStep === sIdx;
                          const hasTitle = step.title !== "";

                          return (
                            <div key={sIdx} style={{ borderTop: "1px solid #f0f0f0" }}>
                              {hasTitle && (
                                <button
                                  type="button"
                                  onClick={() => toggleStep(sIdx)}
                                  aria-expanded={isStepOpen}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 4px",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    color: "var(--color-heading)",
                                    textAlign: "left",
                                  }}
                                >
                                  <span>{step.title}</span>
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      transform: isStepOpen ? "rotate(180deg)" : "rotate(0deg)",
                                      transition: "transform 0.2s ease",
                                      fontSize: 14,
                                      marginLeft: 12,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ▾
                                  </span>
                                </button>
                              )}

                              {(isStepOpen || !hasTitle) && (
                                <div style={{ padding: "2px 4px 12px", lineHeight: 1.9 }}>
                                  {step.content.map((html, cIdx) => (
                                    <p
                                      key={cIdx}
                                      style={{ margin: "2px 0", color: "var(--color-paragraph)" }}
                                      dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}