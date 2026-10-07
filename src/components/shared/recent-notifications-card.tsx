"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import DOMPurify from "isomorphic-dompurify";
import { Bell, ChevronRight } from "lucide-react";

import { relativeTime } from "@/components/layout/notification-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InboxNotification } from "@/types";

type T = Record<string, string>;

export type RecentNotification = Pick<InboxNotification, "id" | "title" | "body" | "created_at" | "is_read"> & {
  /** In-app path the notification opens, if any */
  link?: string | null;
};

/**
 * Latest in-app notifications on a portal dashboard (FPO, admin sub-admin).
 * Notifications with a link open it; `onOpen` runs first, e.g. to mark it read.
 */
export function RecentNotificationsCard({
  items,
  t,
  isLoading = false,
  onOpen,
  viewAllHref,
  emptyHint,
}: {
  items: RecentNotification[];
  t: T;
  isLoading?: boolean;
  onOpen?: (n: RecentNotification) => void;
  viewAllHref?: string;
  emptyHint?: string;
}) {
  const router = useRouter();

  const renderContent = (n: RecentNotification) => (
    <>
      <p className="break-words font-medium text-sm">{n.title}</p>
      {/* Notification templates contain light HTML (e.g. <strong>) — render it
          like the inbox does, but sanitised to formatting tags only. */}
      <p
        className="mt-0.5 break-words text-muted-foreground text-xs"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(n.body, { ALLOWED_TAGS: ["strong", "b", "em", "i", "br"], ALLOWED_ATTR: [] }),
        }}
      />
      <p className="mt-1 text-muted-foreground text-xs">{relativeTime(n.created_at, t)}</p>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{t.card_notifications_title ?? "Recent Notifications"}</CardTitle>
        {viewAllHref && (
          <Link href={viewAllHref} className="shrink-0 text-primary text-xs hover:underline">
            {t.view_all_notifications ?? "View all notifications →"}
          </Link>
        )}
      </CardHeader>
      <CardContent>
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
