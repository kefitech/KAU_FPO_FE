"use client";

import type { CSSProperties } from "react";

import Link from "next/link";

/**
 * Renders a chatbot reply as mixed text + clickable Next.js <Link>s for
 * every internal path token the bot mentions (/fpo/team,
 * /admin/applications, /register?mode=buyer, …). Clicking the path
 * navigates client-side instead of forcing the user to copy-paste it
 * into the address bar.
 */

const PATH_PATTERN =
  /(\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*(?:\?[A-Za-z0-9_\-=&%.,]+)?)/g;

const PATH_ANCHOR =
  /^\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*(?:\?[A-Za-z0-9_\-=&%.,]+)?$/;

interface ChatMessageTextProps {
  text: string;
  linkClassName?: string;
  linkStyle?: CSSProperties;
}

export function ChatMessageText({ text, linkClassName, linkStyle }: ChatMessageTextProps) {
  const parts = text.split(PATH_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (PATH_ANCHOR.test(part)) {
          return (
            <Link
              key={i}
              href={part}
              className={linkClassName}
              style={linkStyle}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
