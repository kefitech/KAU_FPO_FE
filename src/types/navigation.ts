/**
 * Menu item structure that will come from backend
 */
export interface MenuItem {
  id: string;
  title: string;
  titleMl?: string; // Malayalam title
  url: string;
  icon: string; // Icon name as string (e.g., "LayoutDashboard", "Users")
  badge?: string | number;
  children?: MenuItem[];
  permissions?: string[]; // Required permissions to view this item
}

/**
 * Menu group structure
 */
export interface MenuGroup {
  id: string;
  label: string;
  labelMl?: string; // Malayalam label
  items: MenuItem[];
}

/**
 * Complete navigation config from backend
 */
export interface NavigationConfig {
  logo: {
    title: string;
    subtitle: string;
    icon: string;
  };
  groups: MenuGroup[];
  footerItems: MenuItem[];
}

/**
 * User portal type - determines which navigation to load
 */
export type PortalType = "fpo" | "admin" | "government" | "cbbo";

export type IconName = string;
