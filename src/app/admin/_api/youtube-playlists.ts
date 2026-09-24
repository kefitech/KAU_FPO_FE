import { api } from "@/lib/api/client";
import type { AdminYoutubePlaylist, AdminYoutubePlaylistPayload } from "@/types/admin";

export const youtubePlaylistsApi = {
  getAll: (): Promise<AdminYoutubePlaylist[]> =>
    api.get("/admin/youtube-playlists/").then((r) => (r.data as { data: AdminYoutubePlaylist[] }).data),

  create: (payload: AdminYoutubePlaylistPayload): Promise<AdminYoutubePlaylist> =>
    api.post("/admin/youtube-playlists/", payload).then((r) => (r.data as { data: AdminYoutubePlaylist }).data),

  update: (id: number, payload: AdminYoutubePlaylistPayload): Promise<AdminYoutubePlaylist> =>
    api.patch(`/admin/youtube-playlists/${id}/`, payload).then((r) => (r.data as { data: AdminYoutubePlaylist }).data),

  remove: (id: number): Promise<void> => api.delete(`/admin/youtube-playlists/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> => api.post(`/admin/youtube-playlists/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/youtube-playlists/${id}/deactivate/`).then(() => undefined),

  getChannel: (): Promise<{ channel_url: string }> =>
    api.get("/admin/youtube-playlists/channel/").then((r) => (r.data as { data: { channel_url: string } }).data),

  updateChannel: (channel_url: string): Promise<{ channel_url: string }> =>
    api
      .patch("/admin/youtube-playlists/channel/", { channel_url })
      .then((r) => (r.data as { data: { channel_url: string } }).data),
};
