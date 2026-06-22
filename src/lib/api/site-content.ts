import { publicApi } from "@/lib/api/client";

export interface SiteContentBlocks {
  hero_headline: string;
  hero_subheading: string;
  hero_description: string;
  about_title: string;
  about_body: string;
  how_to_register: string;
}

export interface PublicStats {
  total_registrations: number;
  approved_fpos: number;
  total_districts: number;
}

export interface PublicAnnouncement {
  id: number;
  title: string;
  body: string;
  category: "announcement" | "news";
  published_date: string | null;
}

export interface PublicFaq {
  id: number;
  question: string;
  answer: string;
  category: "fpo_general" | "schemes" | "platform_usage";
}

export interface PublicLanguage {
  code: string;
  name: string;
  native_name: string;
  is_default: boolean;
  is_rtl: boolean;
}

export const siteContentApi = {
  getLanguages: (): Promise<PublicLanguage[]> =>
    publicApi.get("/public/languages/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (Array.isArray(d.data) ? d.data : []) as PublicLanguage[];
    }),

  getBlocks: (): Promise<SiteContentBlocks> =>
    publicApi.get("/public/site-content/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as SiteContentBlocks;
    }),

  getStats: (): Promise<PublicStats> =>
    publicApi.get("/public/stats/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as PublicStats;
    }),

  getAnnouncements: (): Promise<PublicAnnouncement[]> =>
    publicApi.get("/public/announcements/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (Array.isArray(d.data) ? d.data : []) as PublicAnnouncement[];
    }),

  getFaqs: (category: string): Promise<PublicFaq[]> =>
    publicApi.get("/public/faqs/", { params: { category } }).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (Array.isArray(d.data) ? d.data : []) as PublicFaq[];
    }),
};
