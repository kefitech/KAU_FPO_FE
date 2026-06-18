"use client";

import { useEffect, useState } from "react";

import { type PublicStats, siteContentApi } from "@/lib/api/site-content";

export function Stats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    siteContentApi.getStats().then(setStats).catch(() => {});
  }, []);

  const items = [
    {
      value: stats ? `${stats.total_registrations}+` : "—",
      label: "FPOs Registered",
      sublabel: "Across Kerala",
    },
    {
      value: stats ? `${stats.approved_fpos}+` : "—",
      label: "Approved FPOs",
      sublabel: "Active on platform",
    },
    {
      value: stats ? String(stats.total_districts) : "—",
      label: "Districts Covered",
      sublabel: "All of Kerala",
    },
    {
      value: "85+",
      label: "Expert Consultants",
      sublabel: "On the platform",
    },
  ];

  return (
    <section className="border-y bg-white py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {items.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-bold text-4xl text-green-600">{stat.value}</p>
              <p className="mt-1 font-medium text-gray-900 text-sm">{stat.label}</p>
              <p className="text-muted-foreground text-xs">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
