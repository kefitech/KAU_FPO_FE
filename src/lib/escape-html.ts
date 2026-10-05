/**
 * Escape text for places that render HTML — e.g. ViewSheet's `title`, which uses
 * dangerouslySetInnerHTML. Use it for any user-entered value shown there.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
