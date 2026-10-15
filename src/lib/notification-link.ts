/**
 * A notification's `link` is an in-app path, or the recipient's webmail home
 * (e.g. an expert's enquiry notice opens their Gmail). The backend only sends
 * https links to known webmail hosts; those open in a new tab.
 */
export function isExternalLink(link: string | null | undefined): link is string {
  return !!link && link.startsWith("https://");
}

export function openExternalLink(link: string) {
  window.open(link, "_blank", "noopener,noreferrer");
}

/** Rendered notification HTML as plain text, entities decoded, for a mail subject. */
function plainText(html: string): string {
  const stripped = html.replace(/<[^>]+>/g, "");
  if (typeof document === "undefined") return stripped;
  const box = document.createElement("textarea");
  box.innerHTML = stripped;
  return box.value;
}

/** `mailto:` link answering the notification's sender, with "Re: <title>" as the subject. */
export function replyMailto(item: { reply_to: string | null; title: string }): string | null {
  if (!item.reply_to) return null;
  return `mailto:${item.reply_to}?subject=${encodeURIComponent(`Re: ${plainText(item.title)}`)}`;
}
