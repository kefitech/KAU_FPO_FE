"use client";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { siteContentApi } from "@/lib/api/site-content";

interface Lang { code: string; native_name: string; is_default: boolean; is_rtl: boolean }

function LangToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setDefaultLocale = useLocaleStore((s) => s.setDefaultLocale);
  const [langs, setLangs] = useState<Lang[]>([]);

  useEffect(() => {
    siteContentApi.getLanguages().then((data) => {
      setLangs(data);
      const def = data.find((l) => l.is_default) ?? data[0];
      if (def) setDefaultLocale(def.code, def.is_rtl);
    }).catch(() => {});
  }, [setDefaultLocale]);

  useEffect(() => {
    if (locale) document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  if (langs.length <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <i className="fas fa-globe" style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }} />
      <select
        value={locale}
        onChange={(e) => {
          const lang = langs.find((l) => l.code === e.target.value);
          setLocale(e.target.value, lang?.is_rtl ?? false);
        }}
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 4,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          padding: "2px 6px",
          cursor: "pointer",
          outline: "none",
          appearance: "auto",
        }}
      >
        {langs.map((l) => (
          <option key={l.code} value={l.code} style={{ background: "#1a3c34", color: "#fff" }}>
            {l.native_name}
          </option>
        ))}
      </select>
    </div>
  );
}

const HeaderTop = () => {
  return (
    <div className="top-bar-area text-light">
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-9">
            <div className="flex-item left">
              <p>That&apos;s right, we only sell 100% organic</p>
              <ul>
                <li><i className="fas fa-map-marker-alt" /> California, TX 70240</li>
                <li><i className="fas fa-phone-alt" /> +4733378901</li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 text-end">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
              <LangToggle />
              <div className="social">
                <ul>
                  <li><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                  <li><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                  <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube" /></a></li>
                  <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderTop;
