"use client";

import "@/app/globals.css";

import { RolePortalLayout } from "@/components/layout/role-portal-layout";

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  return <RolePortalLayout subtitle="Government Portal">{children}</RolePortalLayout>;
}
