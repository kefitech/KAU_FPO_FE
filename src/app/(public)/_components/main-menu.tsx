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
        <a href="/">{t.home ?? "HOME"}</a>
      </li>
      <li>
        <a href="/v1/login">{t.sign_in ?? "Sign In"}</a>
      </li>
      <li>
        <a href="/register">{t.get_started ?? "Get Started"}</a>
      </li>
      <li className={`dropdown pages-dropdown ${openIndex === 1 ? "on" : ""}`}>
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu?.(1)}>
          {t.pages ?? "Pages"}
        </Link>
        <ul className="dropdown-menu">
          <li>
            <Link href="/about-us">{t.about_us ?? "About Us"}</Link>
          </li>
          <li>
            <Link href="/team">{t.team ?? "Team"}</Link>
          </li>
          <li>
            <Link href="/howtoregister">{t.how_to_register_FPO ?? "How To Register FPO"}</Link>
          </li>
          <li>
            <Link href="/news-announcements">{t.events_updates ?? "Events & Updates"}</Link>
          </li>
          <li>
            <Link href="/news-sources">{t.in_the_news ?? "News and Media"}</Link>
          </li>
          <li>
            <Link href="/faq">{t.faqs ?? "FAQs"}</Link>
          </li>
          <li>
            <Link href="/contact-us">{t.contact_us ?? "Contact Us"}</Link>
          </li>
          <li className="more-info-dropdown-item">
            <Link href="/more-info">{t.more_info ?? "More Info"}</Link>
          </li>

        </ul>
      </li>
      <li className="flex items-center more-info-standalone">
        <Link href="/more-info" className="more-info-link">
          {t.more_info ?? "More Info"}
        </Link>
      </li>
    </ul>
  );
};

export default MainMenu;
