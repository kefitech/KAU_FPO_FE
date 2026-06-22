/**
 * Application Constants
 * App-wide configuration and constants
 */

export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || "KAU-FPO Platform",
  URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  DESCRIPTION: "AI-Based Digital Platform for KAU-FPO Linkage Programme",
} as const;

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
} as const;

export const AUTH_CONFIG = {
  SESSION_TIMEOUT: Number(process.env.NEXT_PUBLIC_SESSION_TIMEOUT) || 3600000, // 1 hour
  TOKEN_KEY: "auth_token",
  REFRESH_TOKEN_KEY: "refresh_token",
  USER_KEY: "user_data",
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(",") || [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
  ],
  MIME_TYPES: {
    PDF: "application/pdf",
    JPG: "image/jpeg",
    PNG: "image/png",
    DOC: "application/msword",
    DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;

export const MAP_CONFIG = {
  CENTER: {
    LAT: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT) || 10.5276, // Thrissur
    LNG: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG) || 76.2144,
  },
  DEFAULT_ZOOM: Number(process.env.NEXT_PUBLIC_MAP_ZOOM) || 10,
} as const;

export const LOCALES = {
  DEFAULT: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
  SUPPORTED: process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(",") ?? ["en", "ml"],
} as const;

export const FEATURE_FLAGS = {
  PWA: process.env.NEXT_PUBLIC_ENABLE_PWA === "true",
  OFFLINE_MODE: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === "true",
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  FPO_MANAGER: "fpo_manager",
  EXPERT: "expert",
  VIEWER: "viewer",
} as const;

export const FPO_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
] as const;

export const CROP_CATEGORIES = {
  CEREALS: "Cereals",
  PULSES: "Pulses",
  VEGETABLES: "Vegetables",
  FRUITS: "Fruits",
  SPICES: "Spices",
  CASH_CROPS: "Cash Crops",
  PLANTATION: "Plantation Crops",
} as const;
