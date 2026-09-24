"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  SquarePlay,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { languageApi } from "@/app/admin/_api/language";
import { youtubePlaylistsApi } from "@/app/admin/_api/youtube-playlists";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminYoutubePlaylist } from "@/types/admin";

type T = Record<string, string>;

/** The landing page layout is designed for this many playlists. */
const RECOMMENDED_MAX_PLAYLISTS = 3;

// biome-ignore lint/suspicious/noExplicitAny: API client rejects with the backend's error payload
function firstBackendError(error: any): string | null {
  const payload = error?.message;
  if (payload && typeof payload === "object") return (Object.values(payload).flat()[0] as string) ?? null;
  return typeof payload === "string" ? payload : null;
}

function playlistTitle(playlist: AdminYoutubePlaylist): string {
  return playlist.title?.en || Object.values(playlist.title ?? {})[0] || playlist.playlist_id;
}

// ─── Channel link ─────────────────────────────────────────────────────────────

function ChannelCard({ t }: { t: T }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-youtube-channel"],
    queryFn: youtubePlaylistsApi.getChannel,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data) setUrl(data.channel_url);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => youtubePlaylistsApi.updateChannel(url.trim()),
    onSuccess: () => {
      toast.success(t.yt_channel_saved ?? "Channel link saved.");
      queryClient.invalidateQueries({ queryKey: ["admin-youtube-channel"] });
    },
    onError: (error) =>
      toast.error(firstBackendError(error) ?? t.yt_channel_save_failed ?? "Failed to save channel link."),
  });

  const dirty = !!data && url.trim() !== data.channel_url;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <SquarePlay className="h-4 w-4 text-red-600" />
        <p className="text-sm font-medium">{t.yt_channel_title ?? "YouTube Channel"}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {t.yt_channel_hint ?? "Linked from the YouTube icon in the landing page video section."}
      </p>
      {isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/@KauIndia"
            className="flex-1"
          />
          <Button onClick={() => mutation.mutate()} disabled={!dirty || !url.trim() || mutation.isPending}>
            {mutation.isPending ? (t.btn_saving ?? "Saving…") : (t.btn_save ?? "Save")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Playlist dialog ──────────────────────────────────────────────────────────

function PlaylistDialog({
  open,
  onOpenChange,
  editing,
  nextOrder,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminYoutubePlaylist | null;
  nextOrder: number;
  onSuccess: () => void;
  t: T;
}) {
  const [url, setUrl] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [order, setOrder] = useState("0");

  const { data: languages = [] } = useQuery({
    queryKey: ["active-languages"],
    queryFn: languageApi.getActive,
    staleTime: 5 * 60 * 1000,
  });
  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  useEffect(() => {
    if (!open) return;
    setUrl(editing?.playlist_url ?? "");
    setTitles(editing?.title ?? {});
    setOrder(String(editing?.order ?? nextOrder));
  }, [open, editing, nextOrder]);

  const mutation = useMutation({
    mutationFn: () => {
      // An empty title lets the backend fill it from YouTube
      const title = Object.fromEntries(
        Object.entries(titles)
          .map(([code, value]) => [code, value.trim()])
          .filter(([, value]) => value),
      );
      const payload = { playlist_url: url.trim(), title, order: Number(order) || 0 };
      return editing ? youtubePlaylistsApi.update(editing.id, payload) : youtubePlaylistsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? (t.yt_toast_updated ?? "Playlist updated.") : (t.yt_toast_added ?? "Playlist added."));
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => toast.error(firstBackendError(error) ?? t.yt_toast_save_failed ?? "Failed to save playlist."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? (t.yt_dialog_edit ?? "Edit YouTube Playlist") : (t.yt_dialog_add ?? "Add YouTube Playlist")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Playlist link */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {t.yt_field_url ?? "Playlist link"} <span className="text-destructive">*</span>
            </p>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=PL…"
            />
            <p className="text-xs text-muted-foreground">
              {t.yt_field_url_hint ??
                "Paste the playlist link from YouTube, e.g. https://www.youtube.com/playlist?list=PL…"}
            </p>
          </div>

          {/* Title per language */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t.yt_field_title ?? "Title"}</p>
            {sortedLangs.map((lang) => (
              <div key={lang.code} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{lang.native_name}</span>
                <Input
                  value={titles[lang.code] ?? ""}
                  onChange={(e) => setTitles((prev) => ({ ...prev, [lang.code]: e.target.value }))}
                  maxLength={150}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {t.yt_field_title_hint ?? "Optional — taken from YouTube if left empty."}
            </p>
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t.yt_field_order ?? "Display order"}</p>
            <Input value={order} onChange={(e) => setOrder(e.target.value)} type="number" min="0" className="w-28" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t.btn_cancel ?? "Cancel"}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!url.trim() || mutation.isPending}>
            {mutation.isPending
              ? (t.btn_saving ?? "Saving…")
              : editing
                ? (t.btn_save_changes ?? "Save Changes")
                : (t.yt_btn_add ?? "Add Playlist")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── YouTube Tab ──────────────────────────────────────────────────────────────

export function YoutubeTab({ t = {} }: { t?: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminYoutubePlaylist | null>(null);

  const {
    data: playlists = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-youtube-playlists"],
    queryFn: youtubePlaylistsApi.getAll,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-youtube-playlists"] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? youtubePlaylistsApi.activate(id) : youtubePlaylistsApi.deactivate(id),
    onSuccess: () => {
      toast.success(t.yt_toast_updated ?? "Playlist updated.");
      invalidate();
    },
    onError: () => toast.error(t.yt_toast_action_failed ?? "Action failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => youtubePlaylistsApi.remove(id),
    onSuccess: () => {
      toast.success(t.yt_toast_deleted ?? "Playlist deleted.");
      invalidate();
    },
    onError: () => toast.error(t.yt_toast_action_failed ?? "Action failed."),
  });

  function handleDelete(playlist: AdminYoutubePlaylist) {
    confirm({
      title: t.yt_delete_title ?? "Delete Playlist",
      description: (t.yt_delete_description ?? 'Remove "{name}" from the landing page? This cannot be undone.').replace(
        "{name}",
        playlistTitle(playlist),
      ),
      onConfirm: () => deleteMutation.mutateAsync(playlist.id),
    });
  }

  const activeCount = playlists.filter((p) => p.is_active).length;
  const nextOrder = playlists.reduce((max, p) => Math.max(max, p.order), 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      <ChannelCard t={t} />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t.yt_section_title ?? "YouTube Playlists"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t.yt_btn_add ?? "Add Playlist"}
          </Button>
        </div>
      </div>

      {activeCount > RECOMMENDED_MAX_PLAYLISTS && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0" />
          {t.yt_limit_note ?? "The landing page is designed for up to 3 playlists."}
        </div>
      )}

      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t.yt_col_order ?? "Order"}</TableHead>
              <TableHead>{t.yt_col_title ?? "Title"}</TableHead>
              <TableHead>{t.yt_col_playlist ?? "Playlist"}</TableHead>
              <TableHead>{t.yt_col_status ?? "Status"}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : playlists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                  {t.yt_empty ?? "No playlists added yet."}
                </TableCell>
              </TableRow>
            ) : (
              playlists.map((playlist) => (
                <TableRow key={playlist.id} className={!playlist.is_active ? "opacity-50" : ""}>
                  <TableCell className="text-sm text-muted-foreground">{playlist.order}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[240px] truncate" title={playlistTitle(playlist)}>
                    {playlistTitle(playlist)}
                  </TableCell>
                  <TableCell>
                    <a
                      href={playlist.playlist_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-xs items-center gap-1 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="truncate">{playlist.playlist_id}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        playlist.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {playlist.is_active ? (t.badge_active ?? "Active") : (t.badge_inactive ?? "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[190]">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(playlist);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t.action_edit ?? "Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: playlist.id, active: !playlist.is_active })}
                        >
                          {playlist.is_active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              {t.action_deactivate ?? "Deactivate"}
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              {t.action_activate ?? "Activate"}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(playlist)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.action_delete ?? "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlaylistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        nextOrder={nextOrder}
        onSuccess={invalidate}
        t={t}
      />
    </div>
  );
}
