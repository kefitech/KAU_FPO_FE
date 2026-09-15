import { API_CONFIG } from "@/lib/constants/app";

/**
 * Converts a relative media path (e.g. "/media/marketplace/products/abc.png",
 * as returned by Django's ImageField.url) into a full, browser-loadable URL
 * pointing at the backend server.
 *
 * API_CONFIG.BASE_URL includes the "/api" suffix (e.g. "http://localhost:8000/api"),
 * but media files are served from the domain root, not under /api — so we strip
 * that suffix before joining.
 */
export function toMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const origin = API_CONFIG.BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
