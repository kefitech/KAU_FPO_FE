"use client";
import { useEffect } from "react";
import AOS from "aos";
import Header from "./header";
import Footer from "./footer";
import ScrollToTop from "./scroll-to-top";
import PageLoader from "./page-loader";

interface Props {
  children: React.ReactNode;
}

const AgrulLayout = ({ children }: Props) => {
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
    <>
      <PageLoader />
      <Header />
      {children}
      <Footer />
      <ScrollToTop />
    </>
  );
};

export default AgrulLayout;
