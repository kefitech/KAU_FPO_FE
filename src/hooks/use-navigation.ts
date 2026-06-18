"use client";

import { useQuery } from "@tanstack/react-query";

// Default fallback navigation configs for development/offline
import {
  adminNavigationConfig,
  cbboNavigationConfig,
  fpoNavigationConfig,
  governmentNavigationConfig,
} from "@/config/navigation-defaults";
import { getNavigationConfig, getUserNavigation } from "@/lib/api/navigation";
import type { NavigationConfig, PortalType } from "@/types/navigation";

/**
 * Hook to fetch navigation config for a specific portal
 */
export function usePortalNavigation(portalType: PortalType) {
  return useQuery<NavigationConfig>({
    queryKey: ["navigation", portalType],
    queryFn: () => getNavigationConfig(portalType),
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
    // Use default config as placeholder while loading or on error
    placeholderData: getDefaultConfig(portalType),
  });
}

/**
 * Hook to fetch current user's navigation (based on their role/permissions)
 */
export function useUserNavigation() {
  return useQuery<NavigationConfig>({
    queryKey: ["navigation", "me"],
    queryFn: getUserNavigation,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
  });
}

/**
 * Get default navigation config for a portal type
 * Used as fallback when backend is not available
 */
function getDefaultConfig(portalType: PortalType): NavigationConfig {
  switch (portalType) {
    case "fpo":
      return fpoNavigationConfig;
    case "admin":
      return adminNavigationConfig;
    case "government":
      return governmentNavigationConfig;
    case "cbbo":
      return cbboNavigationConfig;
    default:
      return fpoNavigationConfig;
  }
}
