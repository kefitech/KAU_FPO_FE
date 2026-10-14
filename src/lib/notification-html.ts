import DOMPurify from "isomorphic-dompurify";

/**
 * Notification titles and bodies are HTML from the notification templates. The
 * backend escapes the values it fills in; this is the second layer, for rows saved
 * before that or without a template: keeps formatting and links, strips scripts,
 * event handlers and javascript: URLs.
 */
export function sanitizeNotificationHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
