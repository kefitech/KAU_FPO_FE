"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowRight, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type SiteContentBlocks, siteContentApi } from "@/lib/api/site-content";

export function HowToRegisterSection() {
  const [blocks, setBlocks] = useState<Partial<SiteContentBlocks>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    siteContentApi.getBlocks().then(setBlocks).catch(() => {});
  }, []);

  const content = blocks.how_to_register ?? "";

  return (
    <>
      <section className="bg-green-600 py-16 text-white">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 opacity-80" />
          <h2 className="mb-4 font-bold text-3xl">How to Register Your FPO</h2>
          <p className="mb-8 text-green-100">
            Step-by-step guide to registering your Farmer Producer Organization on the KAU–FPO platform.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              View Registration Guide
            </Button>
            <Button size="lg" className="border border-white bg-transparent hover:bg-white/10" asChild>
              <Link href="/register">
                Start Registration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How to Register Your FPO</DialogTitle>
          </DialogHeader>
          {content ? (
            <div
              className="prose prose-sm max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled content
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Loading guide...</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
