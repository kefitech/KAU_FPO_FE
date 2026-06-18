import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

export const iconMap: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons).filter(([k]) => /^[A-Z]/.test(k)),
) as Record<string, LucideIcon>;

export function getIcon(name: string): LucideIcon {
  if (!name) return LucideIcons.HelpCircle;
  if (iconMap[name]) return iconMap[name];
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return iconMap[capitalized] ?? LucideIcons.HelpCircle;
}
