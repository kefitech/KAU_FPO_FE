"use client";

import { useEffect, useState } from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type PublicFaq, siteContentApi } from "@/lib/api/site-content";

type FaqCategory = "fpo_general" | "schemes" | "platform_usage";

const TABS: { key: FaqCategory; label: string }[] = [
  { key: "fpo_general", label: "FPO General" },
  { key: "schemes", label: "Schemes & Support" },
  { key: "platform_usage", label: "Platform Usage" },
];

export function FaqSection() {
  const [faqsByCategory, setFaqsByCategory] = useState<Partial<Record<FaqCategory, PublicFaq[]>>>({});
  const [activeTab, setActiveTab] = useState<FaqCategory>("fpo_general");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const categories: FaqCategory[] = ["fpo_general", "schemes", "platform_usage"];
    Promise.allSettled(
      categories.map((cat) => siteContentApi.getFaqs(cat).then((data) => ({ cat, data }))),
    ).then((results) => {
      const map: Partial<Record<FaqCategory, PublicFaq[]>> = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          map[r.value.cat] = r.value.data;
        }
      }
      setFaqsByCategory(map);
    });
  }, []);

  const visibleTabs = TABS.filter((t) => {
    const items = faqsByCategory[t.key];
    return items === undefined || items.length > 0;
  });

  const faqs = faqsByCategory[activeTab] ?? [];

  if (visibleTabs.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <h2 className="mb-2 font-bold text-3xl text-gray-900">Frequently Asked Questions</h2>
        <p className="mb-8 text-muted-foreground">Everything you need to know about FPOs and the platform</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              className={activeTab === tab.key ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => {
                setActiveTab(tab.key);
                setOpenId(null);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="divide-y rounded-lg border">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              >
                <span className="font-medium text-gray-900 text-sm pr-4">{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openId === faq.id ? "rotate-180" : ""}`}
                />
              </button>
              {openId === faq.id && (
                <div className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed">{faq.answer}</div>
              )}
            </div>
          ))}
          {faqs.length === 0 && (
            <p className="px-5 py-4 text-muted-foreground text-sm">No FAQs available.</p>
          )}
        </div>
      </div>
    </section>
  );
}
