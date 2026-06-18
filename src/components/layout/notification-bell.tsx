"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          >
            {item.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
            {item.body}
          </p>
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
  const notifications: InboxNotification[] = listData?.data ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

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

        <PopoverContent align="end" className="w-80 p-0">
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
            <ScrollArea className="max-h-[360px]">
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
        </PopoverContent>
      </Popover>

      {/* Detail sheet — rendered outside the Popover so it isn't unmounted when the popover closes */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="w-full max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b px-6 py-4">
            <SheetTitle className="text-base font-semibold leading-snug pr-4">
              {selected?.title}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 mt-0.5"
              onClick={() => setSelected(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Timestamp */}
            <p className="text-xs text-muted-foreground">
              {selected ? formatDate(selected.created_at) : ""}
            </p>

            {/* Body */}
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selected?.body}
            </div>
          </div>

          {/* Footer */}
          {selected && !selected.is_read && (
            <div className="border-t px-6 py-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  markReadMutation.mutate(selected.id);
                  setSelected((prev) =>
                    prev ? { ...prev, is_read: true } : null
                  );
                }}
                disabled={markReadMutation.isPending}
              >
                Mark as read
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
