"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Paths with no standalone page — breadcrumb link should point to the real parent
const HREF_OVERRIDES: Record<string, string> = {
  "/admin/notification-templates": "/admin/notifications?tab=templates",
  "/admin/notification-template-codes": "/admin/notifications?tab=codes",
  "/admin/notification-channel-settings": "/admin/notifications?tab=channels",
  "/admin/categories": "/admin/languages?tab=categories",
  "/admin/translations": "/admin/languages?tab=translations",
  "/admin/menu-items": "/admin/languages?tab=menu",
};

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  languages: "Languages",
  notifications: "Notifications",
  roles: "Roles",
  settings: "Settings",
  profile: "Profile",
  security: "Security",
  "sub-admins": "Sub-Admins",
  "fpo-users": "FPO Users",
  "audit-logs": "Audit Logs",
  "external-apis": "External APIs",
  applications: "FPO Applications",
  "ownership-claims": "Ownership Claims",
  schemes: "Schemes",
  experts: "Expert Directory",
  enquiries: "Enquiries",
  "notification-templates": "Templates",
  "notification-template-codes": "Template Codes",
  "notification-channel-settings": "Channel Settings",
  categories: "Categories",
  translations: "Translations",
  "menu-items": "Menu Items",
  "site-content": "Site Content",
  announcements: "Announcements",
  faqs: "FAQs",
  new: "New",
  edit: "Edit",
};

function toLabel(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function isId(segment: string): boolean {
  return /^\d+$/.test(segment);
}

export function AdminBreadcrumb() {
  const pathname = usePathname();

  // Strip leading /admin and split into segments, skip numeric IDs
  const segments = pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter((s) => s && !isId(s));

  // Build cumulative hrefs for each crumb: /admin/sub-admins, /admin/sub-admins/edit etc.
  // (IDs are included in the href but not displayed as a crumb)
  const rawSegments = pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter(Boolean);

  const crumbs = segments.map((seg) => {
    const segIndex = rawSegments.lastIndexOf(seg);
    const rawHref = `/admin/${rawSegments.slice(0, segIndex + 1).join("/")}`;
    const href = HREF_OVERRIDES[rawHref] ?? rawHref;
    return { label: toLabel(seg), href };
  });

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium text-sm">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="text-sm">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
