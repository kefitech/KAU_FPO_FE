"use client";
import { useEffect, useState } from "react";

import { siteContentApi } from "@/lib/api/site-content";
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
  return (
    <div className="top-bar-area text-light">
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-9">
            <div className="flex-item left">
              <p>Smart &amp; Empowered Farmers</p>
              <ul>
                <li>
                  <i className="fas fa-map-marker-alt" /> <a href="https://maps.app.goo.gl/4FXjLWkpN5jvM8N17">Kerala Agricultural University, Mannuthy P.O, Pin- 680651.</a> 
                </li>
                <li>
                  <i className="fas fa-phone-alt" /> <a href="tel:+91 487 237 0509">+91 487 237 0509</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 text-end">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
              <LangToggle />
              <div className="social">
                <ul>
                  <li>
                    <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook-f" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.x.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-twitter" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-youtube" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin-in" />
                    </a>
                  </li>
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
