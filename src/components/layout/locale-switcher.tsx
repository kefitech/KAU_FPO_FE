"use client";

import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { siteContentApi } from "@/lib/api/site-content";
import { useLocaleStore } from "@/stores/locale-store";

export function LocaleSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setDefaultLocale = useLocaleStore((s) => s.setDefaultLocale);

  const { data: languages = [] } = useQuery({
    queryKey: ["public-languages"],
    queryFn: siteContentApi.getLanguages,
    staleTime: 60 * 1000, // 1 min — reflects admin activate/deactivate quickly
  });

  // On every page load: sync to API default if user hasn't explicitly chosen,
  // or reset to default if the stored locale is no longer active.
  useEffect(() => {
    if (!languages.length) return;
    const defaultLang = languages.find((l) => l.is_default) ?? languages[0];
    const isValid = languages.some((l) => l.code === locale);
    if (!isValid) {
      // Stored locale deactivated — force reset regardless of hasUserChosen
      setLocale(defaultLang.code, defaultLang.is_rtl);
    } else {
      // Sync default for users who haven't explicitly chosen
      setDefaultLocale(defaultLang.code, defaultLang.is_rtl);
    }
  }, [languages, locale, setLocale, setDefaultLocale]);

  useEffect(() => {
    if (locale) document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  const handleChange = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    setLocale(code, lang?.is_rtl ?? false);
  };

  if (languages.length <= 1) return null;

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-8 border px-2 text-xs font-medium sm:w-auto sm:gap-1.5 sm:px-2.5">
        <Languages className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:block"><SelectValue /></span>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-sm">
            <span>{lang.native_name}</span>
            {lang.is_default && (
              <span className="ml-1.5 text-muted-foreground text-xs">default</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
