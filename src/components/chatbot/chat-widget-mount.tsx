"use client";

/**
 * ChatWidgetMount — chooses the right chatbot variant based on route.
 *
 *   /admin/*, /fpo/*, /cbbo/*, /government/*, /expert/*, /buyer/*   → portal (shadcn)
 *   /register*, /v1/login*                                          → hidden
 *   everything else (public landing, market-hub, faq, contact-us…)  → public (agrul-styled)
 *
 * Two separate widgets because the public site uses the agrul Bootstrap
 * theme whose global styles override shadcn primitives, while the portal
 * uses shadcn everywhere. See:
 *   - chat-widget-public.tsx  (pure inline styles, agrul-aesthetic)
 *   - chat-widget-portal.tsx  (shadcn Button/Input, portal-aesthetic)
 */

import { usePathname } from "next/navigation";

// 2026-10-09 (approved): both routes now use the lemlist-style shell —
// launcher + Home/Messages/Help/News tabs + greeting header. It is
// self-contained (inline styles) so it renders identically under the
// agrul Bootstrap theme and the shadcn portal. The old variants remain
// in the repo for instant revert:
//   - chat-widget-public.tsx / chat-widget-portal.tsx (previous UI)
import { ChatWidgetHome } from "./chat-widget-home";


const PORTAL_ROUTE_PREFIXES: readonly string[] = [
  "/admin",
  "/fpo",
  "/cbbo",
  "/government",
  "/expert",
  "/buyer",
];

// Distraction-free flows — no chatbot at all.
const HIDDEN_ROUTE_PREFIXES: readonly string[] = [
  "/register",       // FPO / buyer registration wizard
  "/v1/login",       // login + 2FA + change-password screens
];


export function ChatWidgetMount() {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  // PORTAL_ROUTE_PREFIXES kept for documentation/analytics purposes —
  // the unified widget self-adapts (greeting from the auth store).
  void PORTAL_ROUTE_PREFIXES;
  return <ChatWidgetHome />;
}
