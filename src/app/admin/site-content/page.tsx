"use client";

import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type AdminSiteBlock, adminSiteContentApi } from "@/app/admin/_api/site-content";
import { languageApi } from "@/app/admin/_api/language";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Language } from "@/types/admin";

type T = Record<string, string>;
import { DocumentsTab } from "./_components/documents-tab";
import { GalleryTab } from "./_components/gallery-tab";
import { TeamTab } from "./_components/team-tab";
import { QuickLinksTab } from "./_components/quick-links-tab";
import { NewsSourcesTab } from "./_components/news-sources-tab";
import { FeedbackTab } from "./_components/feedback-tab";

const BLOCK_LABELS: Record<string, string> = {
  hero_headline: "Hero Headline",
  hero_subheading: "Hero Subheading",
  hero_description: "Hero Description",
  about_title: "About Title",
  about_body: "About Body",
  how_to_register: "How to Register",
};

const BLOCK_DESCRIPTIONS: Record<string, string> = {
  hero_headline: "Main heading on the landing page",
  hero_subheading: "Subtitle below the main heading",
  hero_description: "Body paragraph in the hero section",
  about_title: "Heading for the About section",
  about_body: "Body content for the About section",
  how_to_register: "Step-by-step registration guide (shown in modal)",
};

const RICH_TEXT_BLOCKS = ["about_body", "how_to_register", "hero_description"];

function toHtml(content: string): string {
  if (!content) return "";
  if (content.trimStart().startsWith("<")) return content;
  return content
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const BLOCK_ORDER = [
  "hero_headline",
  "hero_subheading",
  "hero_description",
  "about_title",
  "about_body",
  "how_to_register",
];

interface BlockEditorProps {
  block: AdminSiteBlock;
  languages: Language[];
  t: T;
}

function BlockEditor({ block, languages, t }: BlockEditorProps) {
  const queryClient = useQueryClient();

  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  const defaultLang = sortedLangs[0];

  const rawContent = typeof block.content === "object" ? (block.content as Record<string, string>) : {};
  const initialValues = Object.fromEntries(
    Object.entries(rawContent).map(([k, v]) => [k, RICH_TEXT_BLOCKS.includes(block.block_key) ? toHtml(v) : v])
  );
  const [savedValues, setSavedValues] = useState<Record<string, string>>(initialValues);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [activeLang, setActiveLang] = useState<string>(defaultLang?.code ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isRichText = RICH_TEXT_BLOCKS.includes(block.block_key);
  const label = BLOCK_LABELS[block.block_key] ?? block.block_key;
  const description = BLOCK_DESCRIPTIONS[block.block_key] ?? "";
  const currentContent = values[activeLang] ?? "";
  const isEmpty = !currentContent.trim();

  const mutation = useMutation({
    mutationFn: () => {
      if (!values[defaultLang?.code ?? ""]?.trim()) {
        setSaveError(`${defaultLang?.name ?? "Default language"} content is required`);
        throw new Error("validation");
      }
      setSaveError("");
      const content: Record<string, string> = {};
      for (const lang of languages) {
        if (values[lang.code]?.trim()) content[lang.code] = values[lang.code].trim();
      }
      return adminSiteContentApi.update(block.block_key, { content });
    },
    onSuccess: (result) => {
      toast.success(result.message || `"${label}" saved`);
      setSavedValues({ ...values });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["site-content-blocks"] });
    },
    onError: (err: Error) => {
      if (err.message !== "validation") toast.error(t.toast_save_failed ?? "Failed to save");
    },
  });

  const handleCancel = () => {
    setValues({ ...savedValues });
    setSaveError("");
    setIsEditing(false);
  };

  const LanguageBar = () => (
    <div className="rounded-md border bg-muted/40 px-3 py-2.5 sm:px-4">
      {/* Select row */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm shrink-0">{t.field_language ?? "Language:"}</span>
        <Select value={activeLang} onValueChange={setActiveLang}>
          <SelectTrigger className="h-8 flex-1 sm:w-48 sm:flex-none bg-background text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortedLangs.map((lang) => {
              const filled = !!values[lang.code]?.trim();
              return (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    {filled ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    {lang.native_name}
                    {lang.is_default && (
                      <span className="text-muted-foreground text-xs">(default)</span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {/* Badges — show beside select on desktop */}
        <div className="hidden sm:flex items-center gap-1.5 ml-auto">
          {sortedLangs.map((lang) => {
            const filled = !!values[lang.code]?.trim();
            return (
              <span
                key={lang.code}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  filled
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lang.code.toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>
      {/* Badges — show below select on mobile */}
      <div className="flex sm:hidden items-center gap-1.5 mt-2 flex-wrap">
        {sortedLangs.map((lang) => {
          const filled = !!values[lang.code]?.trim();
          return (
            <span
              key={lang.code}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                filled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {lang.code.toUpperCase()}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg">{label}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
          <code className="text-muted-foreground/60 text-xs font-mono mt-1 block">{block.block_key}</code>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={mutation.isPending}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {mutation.isPending ? (t.btn_saving ?? "Saving…") : (t.btn_save ?? "Save")}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="self-start">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t.btn_edit ?? "Edit"}
          </Button>
        )}
      </div>

      {/* Language bar — always visible */}
      {sortedLangs.length > 1 && <LanguageBar />}

      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      {/* View mode */}
      {!isEditing && (
        <div
          className="min-h-[80px] rounded-md border bg-muted/20 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
          title="Click to edit"
        >
          {isEmpty ? (
            <p className="text-muted-foreground/50 text-sm italic">No content — click to add</p>
          ) : isRichText ? (
            <div
              className="prose prose-sm max-w-none text-foreground"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled content
              dangerouslySetInnerHTML={{ __html: currentContent }}
            />
          ) : (
            <p className="text-sm text-foreground">{currentContent}</p>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div>
          {activeLang !== defaultLang?.code && (
            <p className="mb-2 text-muted-foreground text-xs">
              {(t.optional_fallback ?? "Optional — leave blank to show {lang} as fallback.").replace("{lang}", defaultLang?.name ?? "default")}
            </p>
          )}
          {isRichText ? (
            <RichTextEditor
              content={values[activeLang] ?? ""}
              onChange={(html) => {
                setValues((prev) => ({ ...prev, [activeLang]: html }));
                if (activeLang === defaultLang?.code) setSaveError("");
              }}
              minHeight={block.block_key === "about_body" || block.block_key === "how_to_register" ? 320 : 160}
              placeholder={`Enter ${label} in ${sortedLangs.find((l) => l.code === activeLang)?.name ?? activeLang}…`}
            />
          ) : (
            <Textarea
              value={values[activeLang] ?? ""}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [activeLang]: e.target.value }));
                if (activeLang === defaultLang?.code) setSaveError("");
              }}
              rows={2}
              className="resize-y text-sm"
              placeholder={`Enter ${label} in ${sortedLangs.find((l) => l.code === activeLang)?.name ?? activeLang}…`}
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Content Blocks tab ───────────────────────────────────────────────────────

function ContentBlocksTab({ t }: { t: T }) {
  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["site-content-blocks"],
    queryFn: adminSiteContentApi.getAll,
  });

  const { data: languages = [], isLoading: langsLoading } = useQuery({
    queryKey: ["active-languages"],
    queryFn: languageApi.getActive,
    staleTime: 5 * 60 * 1000,
  });

  const [activeKey, setActiveKey] = useState<string>("");
  const isLoading = blocksLoading || langsLoading;

  const sortedBlocks = [...(blocks ?? [])].sort(
    (a, b) => BLOCK_ORDER.indexOf(a.block_key) - BLOCK_ORDER.indexOf(b.block_key),
  );
  const activeBlock = sortedBlocks.find((b) => b.block_key === activeKey) ?? sortedBlocks[0];
  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  const getBlockFillStatus = (block: AdminSiteBlock) => {
    if (typeof block.content !== "object") return false;
    const defaultLang = sortedLangs[0];
    if (!defaultLang) return false;
    return !!(block.content as Record<string, string>)[defaultLang.code]?.trim();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex gap-1 overflow-x-auto pb-1 sm:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-lg" />
          ))}
        </div>
        <div className="hidden sm:block w-52 shrink-0 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 min-h-0">
      {/* Mobile: horizontal scrollable block picker */}
      <div className="flex sm:hidden overflow-x-auto border-b gap-1 pb-1 scrollbar-none">
        {sortedBlocks.map((block) => {
          const isActive = (activeKey || sortedBlocks[0]?.block_key) === block.block_key;
          const isFilled = getBlockFillStatus(block);
          const label = BLOCK_LABELS[block.block_key] ?? block.block_key;
          return (
            <button
              key={block.block_key}
              type="button"
              onClick={() => setActiveKey(block.block_key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {isFilled ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Desktop: left vertical block nav */}
      <nav className="hidden sm:block w-52 shrink-0 border-r pr-4">
        <p className="mb-2 px-3 text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {t.blocks_heading ?? "Blocks"}
        </p>
        <ul className="space-y-0.5">
          {sortedBlocks.map((block) => {
            const isActive = (activeKey || sortedBlocks[0]?.block_key) === block.block_key;
            const isFilled = getBlockFillStatus(block);
            const label = BLOCK_LABELS[block.block_key] ?? block.block_key;
            return (
              <li key={block.block_key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(block.block_key)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {isFilled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 px-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {(t.blocks_filled ?? "{filled} / {total} blocks filled").replace("{filled}", String(sortedBlocks.filter(getBlockFillStatus).length)).replace("{total}", String(sortedBlocks.length))}
          </div>
        </div>
      </nav>

      <div className="flex-1 min-w-0">
        {activeBlock ? (
          <BlockEditor key={activeBlock.block_key} block={activeBlock} languages={languages} t={t} />
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            {t.select_block ?? "Select a block to edit"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { key: "content-blocks", label: "Content Blocks" },
  { key: "documents",      label: "Documents"      },
  { key: "gallery",        label: "Gallery"        },
  { key: "team",           label: "Team"           },
  { key: "quick-links",   label: "Quick Links"    },
  { key: "news-sources",  label: "News Sources"   },
  { key: "feedback",      label: "Feedback"       },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_LABEL_KEYS: Record<string, string> = {
  "content-blocks": "tab_content_blocks",
  documents: "tab_documents",
  gallery: "tab_gallery",
  team: "tab_team",
  "quick-links": "tab_quick_links",
  "news-sources": "tab_news_sources",
  feedback: "tab_feedback",
};

export default function SiteContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") ?? "content-blocks") as TabKey;
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_site_content,common")
      .then((data) => setT(data.admin_site_content ?? {}))
      .catch(() => undefined);
  }, [locale]);

  function setTab(key: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/admin/site-content?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-0 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl">{t.page_title ?? "Site Content"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t.page_description ?? "Manage the public landing page content, documents, and media."}
        </p>
      </div>

      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Mobile: horizontal scrollable tab bar */}
        <div className="flex sm:hidden overflow-x-auto border-b gap-1 pb-1 mb-4 scrollbar-none">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {t[TAB_LABEL_KEYS[key] ?? ""] ?? label}
            </button>
          ))}
        </div>

        {/* Desktop: left vertical nav */}
        <nav className="hidden sm:block w-52 shrink-0 border-r pr-6">
          <ul className="flex flex-col gap-0.5">
            {TABS.map(({ key, label }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tab === key
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {t[TAB_LABEL_KEYS[key] ?? ""] ?? label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0 sm:pl-8">
          {tab === "content-blocks" && <ContentBlocksTab t={t} />}
          {tab === "documents" && <DocumentsTab t={t} />}
          {tab === "gallery" && <GalleryTab t={t} />}
          {tab === "team" && <TeamTab t={t} />}
          {tab === "quick-links" && <QuickLinksTab t={t} />}
          {tab === "news-sources" && <NewsSourcesTab t={t} />}
          {tab === "feedback" && <FeedbackTab t={t} />}
        </div>
      </div>
    </div>
  );
}
