"use client";

import "@/app/globals.css";

import { RolePortalLayout } from "@/components/layout/role-portal-layout";

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolePortalLayout subtitle="Expert Portal">
      {/* expert pages rely on the layout for padding */}
      <div className="p-6">{children}</div>
    </RolePortalLayout>
  );
}
