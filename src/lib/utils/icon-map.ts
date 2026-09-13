import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

export const iconMap: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons).filter(([k]) => /^[A-Z]/.test(k)),
) as Record<string, LucideIcon>;

export function getIcon(name: string): LucideIcon {
  if (!name) return LucideIcons.HelpCircle;
  if (iconMap[name]) return iconMap[name];
  const pascal = name
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return iconMap[pascal] ?? LucideIcons.HelpCircle;
}
