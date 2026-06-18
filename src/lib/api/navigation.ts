import type { ApiResponse } from "@/types/api";
import type { NavigationConfig, PortalType } from "@/types/navigation";

import { apiClient } from "./client";

/**
 * Fetch navigation configuration for a specific portal type
 * The backend will return menu items based on user's role and permissions
 */
export async function getNavigationConfig(portalType: PortalType): Promise<NavigationConfig> {
  const response = await apiClient.get<ApiResponse<NavigationConfig>>(`/v1/navigation/${portalType}`);
  return response.data.data;
}

/**
 * Fetch user's accessible menu items (filtered by permissions)
 */
export async function getUserNavigation(): Promise<NavigationConfig> {
  const response = await apiClient.get<ApiResponse<NavigationConfig>>("/v1/navigation/me");
  return response.data.data;
}
