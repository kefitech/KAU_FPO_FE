"use client";

import { useState } from "react";

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
import type { Language } from "@/types/admin";

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

// Converts legacy plain text (\n\n separated) to HTML for TipTap + view mode.
// If content already starts with an HTML tag, returns it unchanged.
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
}

function BlockEditor({ block, languages }: BlockEditorProps) {
  const queryClient = useQueryClient();

  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  const defaultLang = sortedLangs[0];

  const rawContent = typeof block.content === "object" ? (block.content as Record<string, string>) : {};
  // Normalise legacy plain text to HTML on initial load
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
      if (err.message !== "validation") toast.error("Failed to save");
    },
  });

  const handleCancel = () => {
    setValues({ ...savedValues });
    setSaveError("");
    setIsEditing(false);
  };

  const LanguageBar = () => (
    <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2.5">
      <span className="text-muted-foreground text-sm shrink-0">Language:</span>
      <Select value={activeLang} onValueChange={setActiveLang}>
        <SelectTrigger className="h-8 w-48 bg-background text-sm">
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
      <div className="ml-auto flex items-center gap-1.5">
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">{label}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
          <code className="text-muted-foreground/60 text-xs font-mono mt-1 block">{block.block_key}</code>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={mutation.isPending}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="shrink-0">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
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
              Optional — leave blank to show {defaultLang?.name} as fallback.
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

export default function SiteContentPage() {
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

  return (
    <div className="flex flex-col gap-0 p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Site Content</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Edit the content blocks shown on the public landing page.
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-6">
          <div className="w-56 shrink-0 space-y-1">
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
      ) : (
        <div className="flex gap-6 min-h-0">
          {/* Left nav */}
          <nav className="w-56 shrink-0 border-r pr-4">
            <p className="mb-2 px-3 text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Blocks
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

            {/* Fill summary */}
            <div className="mt-4 px-3">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {sortedBlocks.filter(getBlockFillStatus).length} / {sortedBlocks.length} blocks filled
              </div>
            </div>
          </nav>

          {/* Main editor */}
          <div className="flex-1 min-w-0">
            {activeBlock ? (
              <BlockEditor
                key={activeBlock.block_key}
                block={activeBlock}
                languages={languages}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                Select a block to edit
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
