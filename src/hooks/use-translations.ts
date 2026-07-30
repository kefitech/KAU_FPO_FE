import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { translationsApi } from "@/lib/api/translations";

export function useTranslations(namespace: string) {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locale) return;
    setLoading(true);
    translationsApi.getPublic(locale, namespace).then((data) => {
      setT(data[namespace] ?? {});
      setLoading(false);
    });
  }, [locale, namespace]);

  return { t, loading };
}