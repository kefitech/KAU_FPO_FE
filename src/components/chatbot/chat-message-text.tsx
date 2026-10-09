"use client";

import type { CSSProperties } from "react";

/**
 * Renders a chatbot reply as mixed text + clickable links for every
 * internal path token the bot mentions (/fpo/team, /admin/applications,
 * /register?mode=buyer, …).
 *
 * 2026-10-09 (owner report): these were Next.js <Link>s (soft client-side
 * navigation). Navigating from the public agrul layout into portal
 * routes updated the URL but left the page un-rendered until a manual
 * refresh — the two layouts bootstrap differently. Chat links now use a
 * plain <a> (full navigation), which always lands on a fully loaded
 * page; the widget's conversation survives via localStorage session
 * restore.
 */

const PATH_PATTERN =
  /(\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*(?:\?[A-Za-z0-9_\-=&%.,]+)?)/g;

const PATH_ANCHOR =
  /^\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*(?:\?[A-Za-z0-9_\-=&%.,]+)?$/;

interface ChatMessageTextProps {
  text: string;
  linkClassName?: string;
  linkStyle?: CSSProperties;
  /** Called when the user clicks an internal path link — the widget uses
   *  this to collapse the panel so the destination page is visible
   *  (on mobile the full-screen panel otherwise covers the navigation,
   *  which read as "nothing happened"). */
  onNavigate?: () => void;
}

export function ChatMessageText({ text, linkClassName, linkStyle, onNavigate }: ChatMessageTextProps) {
  const parts = text.split(PATH_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (PATH_ANCHOR.test(part)) {
          return (
            <a
              key={i}
              href={part}
              className={linkClassName}
              style={linkStyle}
              onClick={onNavigate}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
