"use client";
import { useEffect, useState } from "react";

import { siteContentApi } from "@/lib/api/site-content";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

interface Lang {
  code: string;
  native_name: string;
  is_default: boolean;
  is_rtl: boolean;
}

export function LangToggle({ variant }: { variant?: "dark" }) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setDefaultLocale = useLocaleStore((s) => s.setDefaultLocale);
  const [langs, setLangs] = useState<Lang[]>([]);

  useEffect(() => {
    siteContentApi
      .getLanguages()
      .then((data) => {
        setLangs(data);
        const def = data.find((l) => l.is_default) ?? data[0];
        if (def) setDefaultLocale(def.code, def.is_rtl);
      })
      .catch(() => {
        // Intentionally ignore the error
      });
  }, [setDefaultLocale]);

  useEffect(() => {
    if (locale) document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  if (langs.length <= 1) return null;

  return (
    <div className="langToggle-wrapper">
      <i className={`fas fa-globe langToggle-icon ${variant === "dark" ? "langToggle-icon--dark" : ""}`} />
      <select
        value={locale}
        onChange={(e) => {
          const lang = langs.find((l) => l.code === e.target.value);
          setLocale(e.target.value, lang?.is_rtl ?? false);
        }}
        className={variant === "dark" ? "langToggle-select langToggle-select--dark" : "langToggle-select"}
      >
        {langs.map((l) => (
          <option
            key={l.code}
            value={l.code}
            className={variant === "dark" ? "langToggle-option langToggle-option--dark" : "langToggle-option"}
          >
            {l.native_name}
          </option>
        ))}
      </select>
    </div>
  );
}

const HeaderTop = () => {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "nav").then((data) => {
      setT(data.nav ?? {});
    });
  }, [locale]);

  return (
    <div className="top-bar-area text-light">
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            padding: "6px 0",
          }}
        >
          <ul
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              listStyle: "none",
              margin: 0,
              padding: 0,
              flexWrap: "wrap",
            }}
          >
            <li>
              <i className="fas fa-map-marker-alt" />{" "}
              <a href="https://maps.app.goo.gl/4FXjLWkpN5jvM8N17">
                {t.kau_address ?? "Kerala Agricultural University, Mannuthy P.O, , Pin- 680651."}
              </a>
            </li>
            <li>
              <i className="fas fa-phone-alt" />{" "}
              <a href="tel:+914872370150">+91-487-2370150</a> , <a href="tel:+914872370086">+91-487-2370086</a>
            </li>
          </ul>
          <LangToggle />
        </div>
      </div>
    </div>
  );
};

export default HeaderTop;
