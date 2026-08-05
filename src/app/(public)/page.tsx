"use client";
import { translationsApi } from "@/lib/api/translations";
import About from "./_components/about";
import AgrulLayout from "./_components/agrul-layout";
import NewsWidget from "./_components/announcement-news";
import Banner from "./_components/banner";
import Contact from "./_components/contact";
import Documents from "./_components/documents";
import Facts from "./_components/facts";
import Gallery from "./_components/gallery";
import HowToRegister from "./_components/how-to-register";
import AgriTechServicesGrid from "./_components/more-info";
import MoreInformantion from "./_components/more-info";
import NewsSourcesStrip from "./_components/news-sources";
import Services from "./_components/services";
import TeamSection from "./_components/team-section";
import VisitorTracker from "./_components/visitor-tracker";
import WhyChoose from "./_components/why-choose";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";

export default function HomePage() {
    const locale = useLocaleStore((s) => s.locale);
    const [t, setT] = useState<Record<string, string>>({});
  
    useEffect(() => {
      if (!locale) return;
      translationsApi.getPublic(locale, "contact").then((data) => {
        setT(data.contact ?? {});
      });
    }, [locale]);
  
  return (
    <AgrulLayout>
      <VisitorTracker />
      <Banner />
      <About />
      <TeamSection showAll={false} />
      <NewsWidget />
      {/* <MoreInformantion /> */}
      {/* <HowToRegister /> */}

      {/* <Services /> */}
      {/* <ProductList /> */}
      {/* <WhyChoose /> */}
      {/* <Testimonial /> */}
      <Gallery />
      <Facts />
      {/* <Contact /> */}

      
      <NewsSourcesStrip />
      <Documents />
      <Contact t={t} />
    </AgrulLayout>
  );
}
