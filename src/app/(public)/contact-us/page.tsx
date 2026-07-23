"use client";
import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import Contact from "../_components/contact";

export default function ContactPage() {
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
      <BreadCrumb title={t.page_title ?? "Contact Us"} breadCrumb={t.breadcrumb ?? "Contact"} />
      <Contact t={t} />
    </AgrulLayout>
  );
}
