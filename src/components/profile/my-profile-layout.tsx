"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { KeyRound, User } from "lucide-react";

import { translationsApi } from "@/lib/api/translations";

type T = Record<string, string>;

// Shared "My Profile" shell (Profile + Change Password tabs) used by every
// role portal. `basePath` is the portal's profile route, e.g. "/cbbo/profile".
export function MyProfileLayout({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [t, setT] = useState<T>({});

  // My Profile stays in English whatever language is selected
  useEffect(() => {
    translationsApi
      .getPublic("en", "fpo_settings,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.fpo_settings ?? {}) });
      })
      .catch(() => undefined);
  }, []);

  const NAV = [
    { label: t.nav_profile ?? "Profile", href: basePath, icon: User },
    { label: t.nav_password ?? "Change Password", href: `${basePath}/password`, icon: KeyRound },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "My Profile"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.page_description ?? "Manage your account profile and password."}
        </p>
      </div>
      <div className="flex flex-col gap-0 sm:flex-row">
        <div className="scrollbar-none mb-4 flex gap-1 overflow-x-auto border-b pb-1 sm:hidden">
          {NAV.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
        <nav className="hidden w-52 shrink-0 border-r pr-6 sm:block">
          <ul className="flex flex-col gap-0.5">
            {NAV.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 sm:pl-8">{children}</div>
      </div>
    </div>
  );
}
