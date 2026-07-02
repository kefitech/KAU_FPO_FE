"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { KeyRound, User } from "lucide-react";

const NAV = [
  { label: "Profile", href: "/fpo/settings/profile", icon: User },
  { label: "Change Password", href: "/fpo/settings/password", icon: KeyRound },
];

export default function FpoSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Manage your account profile and security preferences.</p>
      </div>

      <div className="flex">
        <nav className="w-52 shrink-0 border-r pr-6">
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

        <div className="min-w-0 flex-1 pl-8">{children}</div>
      </div>
    </div>
  );
}
