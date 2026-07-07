"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { inboxApi } from "@/lib/api/inbox";
import { cn } from "@/lib/utils";
import type { InboxNotification } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFull(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── List item ────────────────────────────────────────────────────────────────

function NotifRow({
  item,
  selected,
  onClick,
}: {
  item: InboxNotification;
  selected: boolean;
  onClick: () => void;
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
              {relativeTime(item.created_at)}
            </span>
          </div>
          <p
            className="mt-0.5 text-xs text-muted-foreground truncate"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
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
}: {
  item: InboxNotification;
  onMarkRead: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <h2
          className="font-semibold text-lg leading-snug"
          dangerouslySetInnerHTML={{ __html: item.title }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>From: <span className="font-medium text-foreground">KAU-FPO Platform</span></span>
            <span>{formatFull(item.created_at)}</span>
          </div>
          {!item.is_read && (
            <Button size="sm" variant="outline" onClick={onMarkRead} disabled={isPending} className="h-7 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark as read
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyList() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
      <Inbox className="h-12 w-12 opacity-20" />
      <p className="text-sm">Your inbox is empty</p>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <Bell className="h-12 w-12 opacity-10" />
      <p className="text-sm">Select a notification to read</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InboxPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<InboxNotification | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["inbox-full", page],
    queryFn: () => inboxApi.getAll({ page, page_size: PAGE_SIZE }),
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => inboxApi.markRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["inbox-full"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-list"] });
      setSelected((prev) => (prev?.id === id ? { ...prev, is_read: true } : prev));
    },
  });

  const markAllMutation = useMutation({
    mutationFn: inboxApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-full"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-list"] });
      setSelected((prev) => (prev ? { ...prev, is_read: true } : null));
    },
  });

  const notifications: InboxNotification[] = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = search.trim()
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase()),
      )
    : notifications;

  // Auto-mark read when opening
  const handleSelect = (item: InboxNotification) => {
    setSelected(item);
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
  };

  // Reset selection when page changes
  useEffect(() => { setSelected(null); }, [page]);

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-4 border-b">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl">Inbox</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0 border-b">
        {/* Left — list */}
        <div className="w-[340px] shrink-0 flex flex-col border-r">
          {/* Search */}
          <div className="px-3 py-2.5 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search notifications…"
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
              <EmptyList />
            ) : (
              filtered.map((n) => (
                <NotifRow
                  key={n.id}
                  item={n}
                  selected={selected?.id === n.id}
                  onClick={() => handleSelect(n)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right — detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <NotifDetail
              item={selected}
              onMarkRead={() => markReadMutation.mutate(selected.id)}
              isPending={markReadMutation.isPending}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>
    </div>
  );
}
