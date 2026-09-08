"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { KeyRound, User } from "lucide-react";

const NAV = [
  { label: "Profile", href: "/cbbo/profile", icon: User },
  { label: "Change Password", href: "/cbbo/profile/password", icon: KeyRound },
];

export default function CbboProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">My Profile</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Manage your account profile and password.</p>
      </div>
      <div className="flex flex-col gap-0 sm:flex-row">
        <div className="flex sm:hidden overflow-x-auto border-b gap-1 pb-1 mb-4 scrollbar-none">
          {NAV.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
        <nav className="hidden sm:block w-52 shrink-0 border-r pr-6">
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
