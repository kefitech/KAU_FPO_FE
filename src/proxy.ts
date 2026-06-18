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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get("auth_token")?.value;

  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // If user is authenticated and trying to access auth routes (login/register)
  // redirect to dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard/overview", request.url));
  }

  // If user is not authenticated and trying to access protected routes
  // redirect to login
  if (!token && isDashboardRoute) {
    const loginUrl = new URL("/v1/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
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
