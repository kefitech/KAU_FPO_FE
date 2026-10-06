/**
 * Anchor props for an admin-entered link: links to this site open in the same
 * tab, links to another domain open in a new tab.
 *
 * "This site" = the hostname the visitor is on, ignoring a leading "www." —
 * so http://35.169.38.1/more-info stays in the tab when browsing 35.169.38.1.
 * Non-web links (mailto:, tel:) are left to the browser.
 */
export function linkTargetProps(url: string): { target?: "_blank"; rel?: string } {
  return isExternalUrl(url) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function isExternalUrl(url: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const target = new URL(url, window.location.href);
    if (target.protocol !== "http:" && target.protocol !== "https:") return false;
    const bare = (host: string) => host.replace(/^www\./, "");
    return bare(target.hostname) !== bare(window.location.hostname);
  } catch {
    return true; // unparseable — safest to keep the visitor's page open
  }
}
