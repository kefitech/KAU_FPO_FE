/**
 * Proxy (Next.js 16 Middleware)
 * Route protection and redirects
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Auth routes that authenticated users shouldn't access
const AUTH_ROUTE_PREFIXES = [
  "/v1/login",
  "/v1/register",
  "/v2/login",
  "/v2/register",
  "/forgot-password",
  "/reset-password",
];

// Protected route prefixes — unauthenticated users get redirected to login
const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/fpo",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Backend sets HttpOnly cookie named "access_token" on login
  const token = request.cookies.get("access_token")?.value;

  const isAuthRoute      = AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Unauthenticated user hitting a protected route → redirect to login immediately
  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/v1/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)",
  ],
};
