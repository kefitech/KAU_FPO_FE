"use client";

import "@/app/globals.css";

import { RolePortalLayout } from "@/components/layout/role-portal-layout";

export default function CbboLayout({ children }: { children: React.ReactNode }) {
  return <RolePortalLayout subtitle="CBBO/NGO Portal">{children}</RolePortalLayout>;
}
