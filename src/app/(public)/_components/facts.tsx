"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { publicFetch } from "../_lib/public-fetch";

interface Stats {
  total_registrations: number;
  approved_fpos: number;
  total_districts: number;
  total_govt_officials: number;
  total_experts: number;
  total_visitors: number;
}

const STAT_KEYS: { key: keyof Stats; tKey: string; fallback: string; unit: string }[] = [
  { key: "total_visitors",      tKey: "stats_visitors",      fallback: "Platform Visitors",  unit: "+" },
  { key: "total_registrations", tKey: "stats_registrations", fallback: "FPO Registrations",  unit: "+" },
  { key: "total_experts",       tKey: "stats_experts",       fallback: "Empanelled Experts", unit: "+" },
];

const Facts = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [t, setT] = useState<Record<string, string>>({});
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "home").then((res) => setT(res.home ?? {}));
  }, [locale]);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/stats/`)
      .then((r) => r.json())
      .then((json) => setStats(json.data as Stats))
      .catch(() => {});
  }, [locale]);

  return (
    <div className="fun-facts-area default-padding">
      <div className="shape-left"><img src="/assets/img/shape/27.png" alt="shape" /></div>
      <div className="container">
        <div className="item-inner">
          <div className="shape-right"><img src="/assets/img/shape/26.png" alt="shape" /></div>
          <div className="row">
            {/* Left heading */}
            <div className="col-lg-4 fun-fact-style-one">
              <div className="heading">
                <div className="sub-title">{t.stats_subtitle ?? "Platform Stats"}</div>
                <h2 className="title">{t.stats_title ?? "KAU–FPO Linkage in Numbers"}</h2>
              </div>
            </div>

            {/* Right counters */}
            <div className="col-lg-8 fun-fact-style-one text-end">
              <div className="row">
                {STAT_KEYS.map(({ key, tKey, fallback, unit }) => (
                  <div key={key} className="col-lg-4 col-md-4 item">
                    <div className="fun-fact">
                      <div className="counter">
                        <div className="timer">
                          {stats ? (
                            <CountUp end={stats[key]} enableScrollSpy />
                          ) : (
                            <span style={{ opacity: 0.3 }}>—</span>
                          )}
                        </div>
                        <div className="operator">{unit}</div>
                      </div>
                      <span className="medium">{t[tKey] ?? fallback}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Facts;
