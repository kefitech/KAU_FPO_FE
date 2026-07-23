"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

interface Props {
  openIndex?: number | null;
  toggleSubMenu?: (index: number) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
  navbarPlacement?: string;
}

const MainMenu = ({ openIndex, toggleSubMenu, navbarPlacement }: Props) => {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "nav").then((data) => {
      setT(data.nav ?? {});
    });
  }, [locale]);

  return (
    <ul className={`nav navbar-nav ${navbarPlacement} navbar-right`} data-in="fadeInDown" data-out="fadeOutUp">
      <li>
        <a href="#">{t.home ?? "HOME"}</a>
      </li>
      <li className={`dropdown ${openIndex === 0 ? "on" : ""}`}>
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu?.(0)}>
          {t.get_started ?? "Get Started"}
        </Link>
        <ul className="dropdown-menu">
          <li><a href="/v1/login">{t.sign_in ?? "Sign In"}</a></li>
          <li><a href="/register">{t.register ?? "Register"}</a></li>
        </ul>
      </li>
      <li className={`dropdown ${openIndex === 1 ? "on" : ""}`}>
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu?.(1)}>
          {t.pages ?? "Pages"}
        </Link>
        <ul className="dropdown-menu">
          <li><Link href="/about-us">{t.about_us ?? "About Us"}</Link></li>
          <li><Link href="/team">{t.team ?? "Team"}</Link></li>
          <li><Link href="/howtoregister">{t.how_to_register ?? "How To Register"}</Link></li>
          <li><Link href="/news-sources">{t.in_the_news ?? "In the News"}</Link></li>
          <li><Link href="/faq">{t.faqs ?? "FAQs"}</Link></li>
          <li><Link href="/contact-us">{t.contact_us ?? "Contact Us"}</Link></li>
        </ul>
      </li>
      <li>
        <Link href="/news-events">{t.events_updates ?? "Events & Updates"}</Link>
      </li>
    </ul>
  );
};

export default MainMenu;
