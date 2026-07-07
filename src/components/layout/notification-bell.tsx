"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ViewSheet } from "@/components/ui/view-sheet";
import { inboxApi } from "@/lib/api/inbox";
import type { InboxNotification } from "@/types";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


function NotificationItem({
  item,
  onRead,
  onView,
}: {
  item: InboxNotification;
  onRead: (id: number) => void;
  onView: (item: InboxNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!item.is_read) onRead(item.id);
        onView(item);
      }}
      className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-2">
        {!item.is_read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
        <div className={!item.is_read ? "" : "pl-4"}>
          <p
            className={`text-sm leading-snug ${
              !item.is_read ? "font-semibold" : "font-normal text-muted-foreground"
            }`}
            dangerouslySetInnerHTML={{ __html: item.title }}
          />
          <p
            className="mt-0.5 line-clamp-2 text-muted-foreground text-xs"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
          <p className="mt-1 text-muted-foreground/70 text-xs">
            {relativeTime(item.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<InboxNotification | null>(null);
  const pathname = usePathname();
  const inboxPath = pathname.startsWith("/fpo") ? "/fpo/inbox" : "/admin/inbox";
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: inboxApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: listData } = useQuery({
    queryKey: ["inbox-list"],
    queryFn: () => inboxApi.getAll({ page: 1, page_size: 15 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => inboxApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-list"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: inboxApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-list"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
    },
  });

  const handleView = (item: InboxNotification) => {
    setOpen(false);
    setSelected(item);
  };

  const unreadCount = countData?.unread_count ?? 0;
  const notifications: InboxNotification[] = Array.from(
    new Map((listData?.data ?? []).map((n) => [n.id, n])).values(),
  );
  const hasUnread = notifications.some((n) => !n.is_read);

  const sheetFields = selected
    ? [
        { label: "Received", type: "date" as const, value: selected.created_at },
        {
          label: "Message",
          type: "node" as const,
          node: (
            <div
              className="text-sm leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selected.body }}
            />
          ),
        },
      ]
    : [];

  const sheetActions =
    selected && !selected.is_read
      ? [
          {
            label: "Mark as read",
            variant: "outline" as const,
            onClick: () => {
              markReadMutation.mutate(selected.id);
              setSelected((prev) => (prev ? { ...prev, is_read: true } : null));
            },
            disabled: markReadMutation.isPending,
          },
        ]
      : undefined;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8} className="w-80 p-0 z-[200] shadow-lg rounded-xl border">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-semibold text-sm">Notifications</p>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-0.5 text-xs"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>

          <Separator />

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="divide-y">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    item={n}
                    onRead={(id) => markReadMutation.mutate(id)}
                    onView={handleView}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          <Separator />
          <div className="px-4 py-2.5">
            <Link
              href={inboxPath}
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline font-medium"
            >
              View all notifications →
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <ViewSheet
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.title ?? ""}
        fields={sheetFields}
        actions={sheetActions}
      />
    </>
  );
}
