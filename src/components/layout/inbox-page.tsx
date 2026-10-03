"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  Bell,
  CheckCheck,
  FileBarChart,
  FileText,
  GraduationCap,
  Inbox,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { inboxApi } from "@/lib/api/inbox";
import { cn } from "@/lib/utils";
import type { InboxCategory, InboxNotification } from "@/types";
import { useLocaleStore } from "@/stores/locale-store";
import { useTranslations } from "@/hooks/use-translations";
type T = Record<string, string>;
// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string, t: T): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t.time_just_now ?? "Just now";
  if (m < 60) return (t.time_minutes_ago ?? "{n}m ago").replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return (t.time_hours_ago ?? "{n}h ago").replace("{n}", String(h));
  const d = Math.floor(h / 24);
  if (d < 30) return (t.time_days_ago ?? "{n}d ago").replace("{n}", String(d));
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFull(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────
// Keys come from the backend (apps/notifications/categories.py).

type CategoryTab = "all" | InboxCategory;

const CATEGORY_FALLBACK_LABELS: Record<InboxCategory, string> = {
  application: "Applications",
  claims: "Ownership Claims",
  dpr: "DPR",
  recommendations: "AI Recommendations",
  expert: "Expert Bookings",
  training: "Training",
  marketplace: "Marketplace",
  schemes: "Schemes & Subsidies",
  other: "General",
};

const CATEGORY_ICONS: Record<CategoryTab, LucideIcon> = {
  all: Inbox,
  application: FileText,
  claims: ShieldCheck,
  dpr: FileBarChart,
  recommendations: Sparkles,
  expert: UserRound,
  training: GraduationCap,
  marketplace: Store,
  schemes: BadgePercent,
  other: Bell,
};

function categoryLabel(category: InboxCategory, t: T): string {
  return t[`category_${category}`] ?? CATEGORY_FALLBACK_LABELS[category] ?? category;
}

type CategoryTabItem = { key: CategoryTab; label: string; total: number; unread: number };

function CountBadge({ tab }: { tab: CategoryTabItem }) {
  return tab.unread > 0 ? (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {tab.unread}
    </span>
  ) : (
    <span className="text-[11px] text-muted-foreground/70">{tab.total}</span>
  );
}

// Vertical = left column of the 3-pane desktop layout (xl+); `collapsed`
// shrinks it to icons only (label in a tooltip, unread count as a badge).
// Horizontal = scrollable strip above the list on smaller screens.
function CategoryTabs({
  active,
  onChange,
  tabs,
  orientation,
  collapsed = false,
  t,
}: {
  active: CategoryTab;
  onChange: (tab: CategoryTab) => void;
  tabs: CategoryTabItem[];
  orientation: "vertical" | "horizontal";
  collapsed?: boolean;
  t: T;
}) {
  const vertical = orientation === "vertical";
  const iconOnly = vertical && collapsed;
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      aria-label={t.category_tabs_label ?? "Notification categories"}
      className={cn(vertical ? "flex flex-col gap-0.5 p-2" : "flex gap-1 overflow-x-auto border-b px-4 sm:px-8")}
    >
      {tabs.map((tab) => {
        const Icon = CATEGORY_ICONS[tab.key];
        const isActive = active === tab.key;
        const button = (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={iconOnly ? `${tab.label} (${tab.unread || tab.total})` : undefined}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors",
              vertical && !iconOnly && "w-full rounded-md px-3 py-2 text-left",
              iconOnly && "relative h-10 w-10 justify-center rounded-md",
              !vertical && "shrink-0 border-b-2 px-3 py-2.5",
              vertical &&
                (isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"),
              !vertical &&
                (isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"),
            )}
          >
            {vertical && <Icon className="h-4 w-4 shrink-0" />}
            {iconOnly ? (
              tab.unread > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {tab.unread}
                </span>
              )
            ) : (
              <>
                <span className={cn(vertical && "min-w-0 flex-1 truncate")}>{tab.label}</span>
                <CountBadge tab={tab} />
              </>
            )}
          </button>
        );
        if (!iconOnly) return button;
        return (
          <Tooltip key={tab.key}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right">
              {tab.label} · {tab.unread > 0 ? `${tab.unread} ${t.label_unread ?? "unread"}` : tab.total}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function NotifRow({
  item,
  selected,
  onClick,
  showCategory,
  t,
}: {
  item: InboxNotification;
  selected: boolean;
  onClick: () => void;
  showCategory: boolean;
  t:T;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-border/50 transition-colors",
        selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50",
        !item.is_read && !selected && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        {!item.is_read ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-sm truncate",
                !item.is_read ? "font-semibold text-foreground" : "font-normal text-muted-foreground",
              )}
              dangerouslySetInnerHTML={{ __html: item.title }}
            />
            <span className="shrink-0 text-[11px] text-muted-foreground/70">
              {relativeTime(item.created_at, t)}
            </span>
          </div>
          <p
            className="mt-0.5 text-xs text-muted-foreground truncate"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
          {showCategory && item.category && (
            <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {categoryLabel(item.category, t)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Detail pane ──────────────────────────────────────────────────────────────

function NotifDetail({
  item,
  onMarkRead,
  isPending,
  onBack,
  t,
}: {
  item: InboxNotification;
  onMarkRead: () => void;
  isPending: boolean;
  onBack?: () => void;
  t: T;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 sm:px-6 py-4 sm:py-5">
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t.btn_back ?? "Back"}
          </button>
        )}
        <h2
          className="font-semibold text-base sm:text-lg leading-snug"
          dangerouslySetInnerHTML={{ __html: item.title }}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <span>{t.label_from ?? "From:"} <span className="font-medium text-foreground">{t.platform_name ?? "KAU-FPO Platform"}</span></span>
            <span>{formatFull(item.created_at)}</span>
          </div>
          {!item.is_read && (
            <Button size="sm" variant="outline" onClick={onMarkRead} disabled={isPending} className="h-7 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              {t.action_mark_as_read ?? "Mark as read"}
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
        <div
          className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyList({ t, category }: { t: T; category: CategoryTab }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
      <Inbox className="h-12 w-12 opacity-20" />
      <p className="text-sm">
        {category === "all"
          ? (t.empty_inbox ?? "Your inbox is empty")
          : (t.empty_category ?? "No notifications in {category}").replace("{category}", categoryLabel(category, t))}
      </p>
    </div>
  );
}

function EmptyDetail({ t }: { t: T }) {
  return (
    <div className="flex flex-col w-6/6 items-center justify-center h-full gap-3 text-muted-foreground">
      <Bell className="h-12 w-12 opacity-10" />
      <p className="text-sm">{t.empty_select ?? "Select a notification to read"}</p>
    </div>
  );
}

const COLLAPSE_STORAGE_KEY = "inbox-categories-collapsed";

// ─── Main component ───────────────────────────────────────────────────────────

export function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<CategoryTab>("all");
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const PAGE_SIZE = 20;
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslations("inbox_page");


  const { data, isLoading } = useQuery({
    queryKey: ["inbox-full", category, page, locale],
    queryFn: () =>
      inboxApi.getAll({ page, page_size: PAGE_SIZE, ...(category !== "all" ? { category } : {}) }),
    staleTime: 30_000,
  });

  const { data: categoryData } = useQuery({
    queryKey: ["inbox-categories"],
    queryFn: () => inboxApi.categories().then((r) => r.data),
    staleTime: 30_000,
  });

  const invalidateInbox = () => {
    queryClient.invalidateQueries({ queryKey: ["inbox-full"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-categories"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-list"] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => inboxApi.markRead(id),
    onSuccess: invalidateInbox,
  });

  // Scoped to the active tab — "All" marks everything read.
  const markAllMutation = useMutation({
    mutationFn: () => inboxApi.markAllRead(category === "all" ? undefined : category),
    onSuccess: invalidateInbox,
  });

  const notifications: InboxNotification[] = data?.data ?? [];
  const totalCount = data?.meta?.pagination?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const tabs: CategoryTabItem[] = [
    {
      key: "all",
      label: t.category_all ?? "All",
      total: categoryData?.all.total ?? 0,
      unread: categoryData?.all.unread ?? 0,
    },
    ...(categoryData?.categories ?? []).map((c) => ({
      key: c.key,
      label: categoryLabel(c.key, t),
      total: c.total,
      unread: c.unread,
    })),
  ];
  // Header badge: whole-inbox unread count (server-side, not just this page).
  const unreadCount = categoryData?.all.unread ?? notifications.filter((n) => !n.is_read).length;
  const activeUnread =
    category === "all" ? unreadCount : (tabs.find((tab) => tab.key === category)?.unread ?? 0);

  // Remember the collapsed category column per browser (read after mount to
  // avoid a hydration mismatch; storage may be unavailable, e.g. private mode).
  useEffect(() => {
    try {
      setCategoriesCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // ignore — default to expanded
    }
  }, []);

  const toggleCategoriesCollapsed = () => {
    setCategoriesCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, prev ? "0" : "1");
      } catch {
        // ignore — preference just won't persist
      }
      return !prev;
    });
  };

  const handleCategoryChange = (tab: CategoryTab) => {
    setCategory(tab);
    setPage(1);
    setSearch("");
  };

  const filtered = search.trim()
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase()),
      )
    : notifications;

  const selected = notifications.find((n) => n.id === selectedId) ?? null;


  // Auto-mark read when opening
  const handleSelect = (item: InboxNotification) => {
    setSelectedId(item.id);
    setShowDetail(true);
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
  };

  // Reset selection when page or category changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset intentionally triggered by page / category change
  useEffect(() => { setSelectedId(null); setShowDetail(false); }, [page, category]);

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Page header — hidden on mobile when viewing detail */}
      <div className={cn("flex items-center justify-between px-4 sm:px-8 py-4 border-b", showDetail && "hidden sm:flex")}>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl sm:text-2xl">{t.page_title ?? "Inbox"}</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {activeUnread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t.action_mark_all_read ?? "Mark all read"}</span>
            <span className="sm:hidden">{t.action_mark_all_short ?? "Mark all"}</span>
          </Button>
        )}
      </div>

      {/* Category tabs, horizontal — below xl only (xl+ uses the vertical column).
          Hidden on mobile when viewing detail. */}
      <div className={cn("xl:hidden", showDetail && "hidden sm:block")}>
        <CategoryTabs active={category} onChange={handleCategoryChange} tabs={tabs} orientation="horizontal" t={t} />
      </div>

      {/* Mobile: detail view */}
      {showDetail && selected && (
        <div className="flex sm:hidden flex-1 min-h-0 flex-col">
          <NotifDetail
            item={selected}
            onMarkRead={() => markReadMutation.mutate(selected.id)}
            isPending={markReadMutation.isPending}
            onBack={() => setShowDetail(false)}
            t={t}
          />
        </div>
      )}

      {/* Mobile: list (hidden when showing detail) */}
      {/* Desktop: split pane always visible */}
      <div className={`flex flex-1 min-h-0 border-b ${showDetail ? "hidden sm:flex" : "flex"}`}>
        {/* Far left — vertical category column (xl+) */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-y-auto border-r bg-muted/20 transition-[width] duration-200 xl:flex",
            categoriesCollapsed ? "w-14" : "w-52",
          )}
        >
          <div className={cn("flex border-b p-2", categoriesCollapsed ? "justify-center" : "items-center justify-between")}>
            {!categoriesCollapsed && (
              <span className="px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.category_heading ?? "Categories"}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleCategoriesCollapsed}
                  aria-expanded={!categoriesCollapsed}
                  aria-label={
                    categoriesCollapsed
                      ? (t.action_expand_categories ?? "Expand categories")
                      : (t.action_collapse_categories ?? "Collapse categories")
                  }
                >
                  {categoriesCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {categoriesCollapsed
                  ? (t.action_expand_categories ?? "Expand categories")
                  : (t.action_collapse_categories ?? "Collapse categories")}
              </TooltipContent>
            </Tooltip>
          </div>
          <CategoryTabs
            active={category}
            onChange={handleCategoryChange}
            tabs={tabs}
            orientation="vertical"
            collapsed={categoriesCollapsed}
            t={t}
          />
        </aside>

        {/* Left — list */}
        <div className="w-full sm:w-[340px] shrink-0 flex flex-col sm:border-r">
          {/* Search */}
          <div className="px-3 py-2.5 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder={t.search_placeholder ?? "Search notifications…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-0 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  <div key={i} className="flex flex-col gap-1.5 px-2 py-3 border-b">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyList t={t} category={category} />
            ) : (
              filtered.map((n) => (
                <NotifRow
                  key={n.id}
                  item={n}
                  selected={selected?.id === n.id}
                  onClick={() => handleSelect(n)}
                  showCategory={category === "all"}
                  t={t}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>{(t.pagination_label ?? "Page {page} of {total}").replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  {t.btn_prev ?? "Prev"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  {t.btn_next ?? "Next"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right — detail (desktop only) */}
        <div className="hidden sm:flex flex-1 min-w-0">
          {selected ? (
            <NotifDetail
              item={selected}
              onMarkRead={() => markReadMutation.mutate(selected.id)}
              isPending={markReadMutation.isPending}
              t={t}
            />
          ) : (
            <EmptyDetail t={t} />
          )}
        </div>
      </div>
    </div>
  );
}
