/**
 * Role-Based Access Control Configuration
 * Define permissions for each role
 */

import { USER_ROLES } from "@/lib/constants/app";

export type Permission =
  | "fpo:create"
  | "fpo:read"
  | "fpo:update"
  | "fpo:delete"
  | "fpo:approve"
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "roles:manage"
  | "translations:manage"
  | "analytics:view"
  | "recommendations:generate"
  | "market:access"
  | "experts:access";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    "fpo:create",
    "fpo:read",
    "fpo:update",
    "fpo:delete",
    "fpo:approve",
    "users:create",
    "users:read",
    "users:update",
    "users:delete",
    "roles:manage",
    "translations:manage",
    "analytics:view",
    "recommendations:generate",
    "market:access",
    "experts:access",
  ],
  [USER_ROLES.ADMIN]: [
    "fpo:create",
    "fpo:read",
    "fpo:update",
    "fpo:approve",
    "users:read",
    "analytics:view",
    "recommendations:generate",
    "market:access",
    "experts:access",
  ],
  [USER_ROLES.FPO_MANAGER]: [
    "fpo:create",
    "fpo:read",
    "fpo:update",
    "recommendations:generate",
    "market:access",
    "experts:access",
  ],
  [USER_ROLES.EXPERT]: ["fpo:read", "analytics:view", "experts:access"],
  [USER_ROLES.VIEWER]: ["fpo:read", "analytics:view"],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
