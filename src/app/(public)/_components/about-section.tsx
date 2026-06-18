"use client";

import { useEffect, useState } from "react";

import { type SiteContentBlocks, siteContentApi } from "@/lib/api/site-content";

export function AboutSection() {
  const [blocks, setBlocks] = useState<Partial<SiteContentBlocks>>({});

  useEffect(() => {
    siteContentApi.getBlocks().then(setBlocks).catch(() => {});
  }, []);

  const title = blocks.about_title ?? "About the KAU–FPO Linkage Programme";
  const body = blocks.about_body ?? "";

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <h2 className="mb-8 font-bold text-3xl text-gray-900">{title}</h2>
        {body ? (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled content
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </div>
    </section>
  );
}
