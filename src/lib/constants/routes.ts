/**
 * Application Routes
 * Centralized route paths for the application
 */

export const ROUTES = {
  // Public routes
  HOME: "/",
  ABOUT: "/about",

  // Auth routes
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  // Dashboard routes
  DASHBOARD: "/dashboard",
  OVERVIEW: "/dashboard/overview",

  // FPO routes
  FPO: "/dashboard/fpo",
  FPO_REGISTER: "/dashboard/fpo/register",
  FPO_DETAIL: (id: string) => `/dashboard/fpo/${id}`,

  // Recommendations
  RECOMMENDATIONS: "/dashboard/recommendations",

  // Market
  MARKET: "/dashboard/market",

  // Experts
  EXPERTS: "/dashboard/experts",

  // Analytics
  ANALYTICS: "/dashboard/analytics",

  // Admin routes
  USERS: "/dashboard/users",
  ROLES: "/dashboard/roles",
  TRANSLATIONS: "/dashboard/translations",

  // Settings
  SETTINGS: "/dashboard/settings",

  // Error pages
  UNAUTHORIZED: "/unauthorized",
  NOT_FOUND: "/404",
} as const;

export type RouteKey = keyof typeof ROUTES;
