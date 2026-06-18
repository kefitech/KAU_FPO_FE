"use client";

import { useEffect, useMemo, useState } from "react";

import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type PublicAnnouncement, siteContentApi } from "@/lib/api/site-content";

type Category = "all" | "announcement" | "news";

const TABS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "announcement", label: "Announcements" },
  { key: "news", label: "News" },
];

function formatDate(date: string | null): string {
  if (!date) return "Recently";
  return new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [activeTab, setActiveTab] = useState<Category>("all");

  useEffect(() => {
    siteContentApi.getAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (activeTab === "all" ? announcements : announcements.filter((a) => a.category === activeTab)),
    [announcements, activeTab],
  );

  const displayed = filtered.slice(0, 4);

  if (announcements.length === 0) return null;

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <h2 className="mb-2 font-bold text-3xl text-gray-900">News & Announcements</h2>
        <p className="mb-8 text-muted-foreground">Stay updated with the latest from the KAU–FPO platform</p>

        <div className="mb-6 flex gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              className={activeTab === tab.key ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    item.category === "announcement"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }
                >
                  {item.category === "announcement" ? "Announcement" : "News"}
                </Badge>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.published_date)}
                </span>
              </div>
              <h3 className="mb-1 font-semibold text-gray-900">{item.title}</h3>
              <p className="line-clamp-2 text-muted-foreground text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
