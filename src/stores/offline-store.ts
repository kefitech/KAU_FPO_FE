import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Offline/Connectivity Store
 * Manages offline state and sync queue for PWA functionality
 */

export type SyncItemType = "product" | "crop_data" | "recommendation_feedback";

export type SyncStatus = "pending" | "syncing" | "failed" | "completed";

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: SyncStatus;
  error?: string;
}

interface OfflineState {
  // Connectivity status
  isOnline: boolean;
  lastOnlineAt: number | null;

  // Sync queue
  syncQueue: SyncQueueItem[];

  // Cached data for offline viewing
  cachedRecommendations: Record<string, unknown>[];
  cachedProducts: Record<string, unknown>[];

  // Actions
  setOnline: (online: boolean) => void;

  // Sync queue management
  addToSyncQueue: (item: Omit<SyncQueueItem, "id" | "timestamp" | "retryCount" | "status">) => void;
  updateSyncItemStatus: (id: string, status: SyncStatus, error?: string) => void;
  incrementRetryCount: (id: string) => void;
  removeFromSyncQueue: (id: string) => void;
  clearCompletedItems: () => void;

  // Cache management
  cacheRecommendation: (data: Record<string, unknown>) => void;
  cacheProduct: (data: Record<string, unknown>) => void;
  clearCache: () => void;

  // Getters
  getPendingSyncItems: () => SyncQueueItem[];
  getSyncQueueCount: () => number;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      lastOnlineAt: null,
      syncQueue: [],
      cachedRecommendations: [],
      cachedProducts: [],

      setOnline: (online) =>
        set({
          isOnline: online,
          lastOnlineAt: online ? Date.now() : get().lastOnlineAt,
        }),

      addToSyncQueue: (item) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              retryCount: 0,
              status: "pending" as SyncStatus,
            },
          ],
        })),

      updateSyncItemStatus: (id, status, error) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((item) => (item.id === id ? { ...item, status, error } : item)),
        })),

      incrementRetryCount: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item,
          ),
        })),

      removeFromSyncQueue: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        })),

      clearCompletedItems: () =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.status !== "completed"),
        })),

      cacheRecommendation: (data) =>
        set((state) => {
          // Keep only last 20 recommendations
          const updated = [data, ...state.cachedRecommendations].slice(0, 20);
          return { cachedRecommendations: updated };
        }),

      cacheProduct: (data) =>
        set((state) => {
          // Keep only last 50 products
          const updated = [data, ...state.cachedProducts].slice(0, 50);
          return { cachedProducts: updated };
        }),

      clearCache: () =>
        set({
          cachedRecommendations: [],
          cachedProducts: [],
        }),

      getPendingSyncItems: () =>
        get().syncQueue.filter((item) => item.status === "pending" || item.status === "failed"),

      getSyncQueueCount: () => get().syncQueue.filter((item) => item.status !== "completed").length,
    }),
    {
      name: "offline-store",
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        cachedRecommendations: state.cachedRecommendations,
        cachedProducts: state.cachedProducts,
        lastOnlineAt: state.lastOnlineAt,
      }),
    },
  ),
);

// Initialize online status listener (client-side only)
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useOfflineStore.getState().setOnline(true);
  });

  window.addEventListener("offline", () => {
    useOfflineStore.getState().setOnline(false);
  });
}
