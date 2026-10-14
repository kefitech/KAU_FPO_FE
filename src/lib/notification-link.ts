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
