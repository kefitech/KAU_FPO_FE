import Link from "next/link";

import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer id="about" className="border-t bg-gray-900 text-gray-400">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-white">KAU-FPO Platform</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              AI-Based Digital Platform for KAU-FPO Linkage Programme. Developed by KefiTech in partnership with Kerala
              Agricultural University.
            </p>
          </div>

          {/* Portals */}
          <div>
            <h4 className="mb-4 font-semibold text-sm text-white">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/fpo/dashboard" className="transition-colors hover:text-white">
                  FPO Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="transition-colors hover:text-white">
                  Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/government/dashboard" className="transition-colors hover:text-white">
                  Government Portal
                </Link>
              </li>
              <li>
                <Link href="/cbbo/dashboard" className="transition-colors hover:text-white">
                  CBBO Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-semibold text-sm text-white">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/v1/login" className="transition-colors hover:text-white">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/v1/register" className="transition-colors hover:text-white">
                  Register FPO
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-gray-800 border-t pt-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} Kerala Agricultural University. All rights reserved.</p>
          <p>Built by KefiTech</p>
        </div>
      </div>
    </footer>
  );
}
