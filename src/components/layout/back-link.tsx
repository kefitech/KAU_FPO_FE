"use client";

import type { ComponentProps, MouseEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Cross-links between admin sections (e.g. Sub-Admins → Applications) carry
 * `?back=<origin URL>` so the layout's Back button returns to the exact page,
 * filters and pagination the user came from instead of the dashboard.
 */
export const BACK_PARAM = "back";

/** `href` with the current admin URL (path + query) attached as its Back target. */
export function withBackLink(href: string): string {
  const url = new URL(href, window.location.origin);
  url.searchParams.set(BACK_PARAM, window.location.pathname + window.location.search);
  return url.pathname + url.search;
}

/** The Back target from the current URL — only admin paths, so it can't send the user off-site. */
export function getBackTarget(): string | null {
  const target = new URLSearchParams(window.location.search).get(BACK_PARAM);
  return target && /^\/admin(\/|\?|$)/.test(target) ? target : null;
}

/**
 * A Link that records where it was clicked from. The URL is read at click time
 * (not render time) so table pagination/search changes made just before the
 * click are always included.
 */
export function BackLink({ href, onClick, onMouseDown, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();

  return (
    <Link
      href={href}
      {...props}
      // Covers middle-click, Ctrl/Cmd-click and "Open in new tab", which use the DOM href.
      onMouseDown={(e: MouseEvent<HTMLAnchorElement>) => {
        onMouseDown?.(e);
        e.currentTarget.href = withBackLink(href);
      }}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(withBackLink(href));
      }}
    />
  );
}
