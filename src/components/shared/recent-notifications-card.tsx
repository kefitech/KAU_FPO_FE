"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "isomorphic-dompurify";
import { Bell, ChevronRight } from "lucide-react";

import { relativeTime } from "@/components/layout/notification-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { inboxApi } from "@/lib/api/inbox";
import type { InboxNotification } from "@/types";

type T = Record<string, string>;

export type RecentNotification = Pick<InboxNotification, "id" | "title" | "body" | "created_at" | "is_read"> & {
  /** In-app path the notification opens, if any */
  link?: string | null;
};

// Notification templates contain light HTML (e.g. <strong>) and escape the values
// they substitute — render them like the inbox does, sanitised to formatting tags only.
const sanitize = (html: string) =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS: ["strong", "b", "em", "i", "br"], ALLOWED_ATTR: [] });

/**
 * `onOpen` for the card: marks an unread notification read and refreshes the bell,
 * the inbox and the dashboard's own list (`listKey`).
 */
export function useMarkNotificationRead(listKey: QueryKey) {
  const queryClient = useQueryClient();
  return (n: RecentNotification) => {
    if (n.is_read) return;
    inboxApi
      .markRead(n.id)
      .then(() => {
        for (const queryKey of [
          listKey,
          ["inbox-unread-count"],
          ["inbox-list"],
          ["inbox-full"],
          ["inbox-categories"],
        ]) {
          queryClient.invalidateQueries({ queryKey });
        }
      })
      .catch(() => undefined);
  };
}

/**
 * Latest in-app notifications on a portal dashboard (FPO, admin sub-admin, CBBO, government).
 * Notifications with a link open it; `onOpen` runs first, e.g. to mark it read.
 */
export function RecentNotificationsCard({
  items,
  t,
  isLoading = false,
  onOpen,
  viewAllHref,
  emptyHint,
  className,
}: {
  items: RecentNotification[];
  t: T;
  isLoading?: boolean;
  onOpen?: (n: RecentNotification) => void;
  viewAllHref?: string;
  emptyHint?: string;
  /** e.g. a height limit — the list scrolls inside it */
  className?: string;
}) {
  const router = useRouter();

  const renderContent = (n: RecentNotification) => (
    <>
      {/* Clamped so each notification stays compact — the page it links to has the full text */}
      <p
        className="line-clamp-1 break-words font-medium text-sm"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: sanitize(n.title) }}
      />
      <p
        className="mt-0.5 line-clamp-2 break-words text-muted-foreground text-xs"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: sanitize(n.body) }}
      />
      <p className="mt-1 text-muted-foreground text-xs">{relativeTime(n.created_at, t)}</p>
    </>
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{t.card_notifications_title ?? "Recent Notifications"}</CardTitle>
        {viewAllHref && (
          <Link href={viewAllHref} className="shrink-0 text-primary text-xs hover:underline">
            {t.view_all_notifications ?? "View all notifications →"}
          </Link>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">{t.no_notifications ?? "No notifications yet"}</p>
            {emptyHint && <p className="text-muted-foreground text-xs">{emptyHint}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((n) => {
              const boxClass = `rounded-lg border p-3 ${!n.is_read ? "border-primary/20 bg-primary/5" : ""}`;
              const { link } = n;
              return link ? (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onOpen?.(n);
                    router.push(link);
                  }}
                  className={`${boxClass} flex w-full items-start gap-2 text-left transition-colors hover:bg-muted/50`}
                >
                  <div className="min-w-0 flex-1">{renderContent(n)}</div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <div key={n.id} className={boxClass}>
                  {renderContent(n)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
