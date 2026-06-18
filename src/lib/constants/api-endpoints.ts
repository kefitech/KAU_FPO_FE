/**
 * API Endpoints
 * Centralized API endpoint paths
 */

const API_VERSION = "/v1";

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `/auth/login/`,
    REGISTER: `/auth/register/`,
    LOGOUT: `/auth/logout/`,
    REFRESH: `/auth/refresh/`,
    FORGOT_PASSWORD: `/auth/forgot-password/`,
    RESET_PASSWORD: `/auth/reset-password/`,
    ME: `/auth/me/`,
  },

  // FPO
  FPO: {
    LIST: `${API_VERSION}/fpo`,
    CREATE: `${API_VERSION}/fpo`,
    DETAIL: (id: string) => `${API_VERSION}/fpo/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/fpo/${id}`,
    DELETE: (id: string) => `${API_VERSION}/fpo/${id}`,
    UPLOAD_DOCUMENT: (id: string) => `${API_VERSION}/fpo/${id}/documents`,
    CHECK_ELIGIBILITY: `${API_VERSION}/fpo/check-eligibility`,
  },

  // Recommendations
  RECOMMENDATIONS: {
    GET: (fpoId: string) => `${API_VERSION}/recommendations/${fpoId}`,
    GENERATE: `${API_VERSION}/recommendations/generate`,
  },

  // Market
  MARKET: {
    PRODUCTS: `${API_VERSION}/market/products`,
    BUYERS: `${API_VERSION}/market/buyers`,
    MATCHES: (fpoId: string) => `${API_VERSION}/market/matches/${fpoId}`,
  },

  // Experts
  EXPERTS: {
    LIST: `${API_VERSION}/experts`,
    DETAIL: (id: string) => `${API_VERSION}/experts/${id}`,
    SEARCH: `${API_VERSION}/experts/search`,
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: `${API_VERSION}/analytics/dashboard`,
    DISTRICT: (district: string) => `${API_VERSION}/analytics/district/${district}`,
    CROPS: `${API_VERSION}/analytics/crops`,
    SCHEMES: `${API_VERSION}/analytics/schemes`,
  },

  // Users
  USERS: {
    LIST: `${API_VERSION}/users`,
    CREATE: `${API_VERSION}/users`,
    DETAIL: (id: string) => `${API_VERSION}/users/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/users/${id}`,
    DELETE: (id: string) => `${API_VERSION}/users/${id}`,
  },

  // Roles
  ROLES: {
    LIST: `${API_VERSION}/roles`,
    PERMISSIONS: `${API_VERSION}/roles/permissions`,
  },

  // Translations
  TRANSLATIONS: {
    LIST: `${API_VERSION}/translations`,
    LOCALE: (locale: string) => `${API_VERSION}/translations/${locale}`,
  },

  // File Upload
  UPLOAD: {
    FILE: `${API_VERSION}/upload/file`,
    IMAGE: `${API_VERSION}/upload/image`,
  },
} as const;
