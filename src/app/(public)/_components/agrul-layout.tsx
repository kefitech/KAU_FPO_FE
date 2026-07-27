"use client";
import { useEffect } from "react";
import AOS from "aos";
import { useLocaleStore } from "@/stores/locale-store";
import Header from "./header";
import Footer from "./footer";
import ScrollToTop from "./scroll-to-top";
import PageLoader from "./page-loader";

interface Props {
  children: React.ReactNode;
}

const AgrulLayout = ({ children }: Props) => {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    AOS.init({
      easing: "ease-out-back",
      duration: 1000,
      once: true,
      disable: window.innerWidth < 768,
    });

    // Empty beforeunload listener opts this page out of bfcache,
    // so back navigation always triggers a real page load (not a frozen restore).
    const noop = () => {};
    window.addEventListener("beforeunload", noop);
    return () => window.removeEventListener("beforeunload", noop);
  }, []);

  return (
    <div data-lang={locale || "en"}>
      <PageLoader />
      <Header />
      {children}
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default AgrulLayout;
