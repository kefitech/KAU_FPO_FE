"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowRight, Sprout } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type SiteContentBlocks, siteContentApi } from "@/lib/api/site-content";

export function Hero() {
  const [blocks, setBlocks] = useState<Partial<SiteContentBlocks>>({});

  useEffect(() => {
    siteContentApi.getBlocks().then(setBlocks).catch(() => {});
  }, []);

  const headline = blocks.hero_headline ?? "Empowering Farmer Producer Organizations in Kerala";
  const subheading = blocks.hero_subheading ?? "A unified digital platform connecting FPOs, agricultural experts, and markets across Kerala.";
  const description = blocks.hero_description ?? "AI-powered platform streamlining FPO operations, access to crop recommendations, expert consultancy, and market linkages.";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 py-20 md:py-32">
      <div className="container mx-auto max-w-7xl px-4 text-center">
        <Badge variant="outline" className="mb-6 border-green-200 bg-green-50 text-green-700">
          <Sprout className="mr-1.5 h-3 w-3" />
          Kerala Agricultural University Initiative
        </Badge>

        <h1 className="mx-auto mb-6 max-w-4xl font-bold text-4xl text-gray-900 tracking-tight md:text-6xl">
          {headline}
        </h1>

        <p className="mx-auto mb-4 max-w-2xl text-base text-muted-foreground">
          {subheading}
        </p>

        <div
          className="mx-auto mb-10 max-w-2xl text-muted-foreground text-sm prose prose-sm"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled content
          dangerouslySetInnerHTML={{ __html: description }}
        />

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
            <Link href="/register">
              Register Your FPO
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/v1/login">Access Dashboard</Link>
          </Button>
        </div>

        <p className="mt-6 text-muted-foreground text-sm">Supporting farmers across all 14 districts of Kerala</p>
      </div>

      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-green-100 opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
    </section>
  );
}
