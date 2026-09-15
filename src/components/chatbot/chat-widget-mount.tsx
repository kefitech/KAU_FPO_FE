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

import { ChatWidgetPortal } from "./chat-widget-portal";
import { ChatWidgetPublic } from "./chat-widget-public";


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

  const isPortal = PORTAL_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
  return isPortal ? <ChatWidgetPortal /> : <ChatWidgetPublic />;
}
