"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

interface Video {
  video_id: string;
  title: string;
  thumbnail: string;
}

interface Playlist {
  id: number;
  playlist_id: string;
  title: string;
  playlist_url: string;
  videos: Video[];
}

interface YoutubeData {
  channel_url: string;
  playlists: Playlist[];
}

const YoutubeVideos = () => {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});
  const [data, setData] = useState<YoutubeData | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "home").then((res) => setT(res.home ?? {}));
  }, [locale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: locale intentionally triggers a refetch (titles are translated)
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/youtube-playlists/`)
      .then((r) => r.json())
      .then((json) => setData((json.data as YoutubeData) ?? null))
      .catch(() => setData(null));
  }, [locale]);

  const playlists = data?.playlists ?? [];
  if (playlists.length === 0) return null;

  const active = playlists.find((p) => p.id === activeId) ?? playlists[0];
  const embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${active.playlist_id}&autoplay=1&mute=1&rel=0`;

  return (
    <div className="yt-videos-area default-padding bottom-less bg-dark text-light">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title" style={{ color: "var(--color-secondary)" }}>
                {t.videos_subtitle ?? "Watch & Learn"}
              </h5>
              <h2 className="title">{t.videos_title ?? "Videos from KAU"}</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        {/* Playlist tabs + channel link */}
        <div className="yt-toolbar">
          <div className="yt-tabs" role="tablist">
            {playlists.length > 1 &&
              playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === active.id}
                  className={`yt-tab ${p.id === active.id ? "active" : ""}`}
                  onClick={() => setActiveId(p.id)}
                >
                  {p.title}
                </button>
              ))}
          </div>
          <a
            href={data?.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="yt-channel-btn"
            title={t.videos_channel ?? "YouTube Channel"}
          >
            <i className="fab fa-youtube" aria-hidden="true" />
            <span>{t.videos_channel ?? "YouTube Channel"}</span>
          </a>
        </div>

        <div className="row yt-body">
          {/* Preview player */}
          <div className="col-lg-7">
            <div className="yt-player">
              <iframe
                key={active.playlist_id}
                src={embedUrl}
                title={active.title}
                loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Video list — each opens on YouTube */}
          <div className="col-lg-5">
            <div className="yt-list-wrap">
              <div className="yt-list">
                <ul>
                  {active.videos.map((v) => (
                    <li key={v.video_id}>
                      <a
                        href={`https://www.youtube.com/watch?v=${v.video_id}&list=${active.playlist_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.videos_watch ?? "Watch on YouTube"}
                      >
                        {/* biome-ignore lint/performance/noImgElement: external YouTube thumbnail */}
                        <img src={v.thumbnail} alt="" loading="lazy" />
                        <span className="yt-video-title">{v.title}</span>
                        <i className="fas fa-external-link-alt yt-ext" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
                <a href={active.playlist_url} target="_blank" rel="noopener noreferrer" className="yt-full-link">
                  {t.videos_view_playlist ?? "View full playlist on YouTube"} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global because the yt-* class names are unique to this section */}
      <style jsx global>{`
        .yt-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 24px;
        }
        .yt-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .yt-tab {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: transparent;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .yt-tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .yt-tab.active {
          background: var(--color-secondary);
          border-color: var(--color-secondary);
          color: #1f2d24;
        }
        .yt-channel-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          padding: 8px 16px;
          border-radius: 999px;
          background: #ff0000;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s ease;
        }
        .yt-channel-btn:hover {
          background: #cc0000;
          color: #fff;
        }
        .yt-channel-btn i {
          font-size: 18px;
        }
        .yt-body {
          row-gap: 20px;
        }
        .yt-player {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 10px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .yt-player iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
        .yt-list-wrap {
          position: relative;
          height: 100%;
          min-height: 320px;
        }
        .yt-list {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .yt-list ul {
          flex: 1;
          margin: 0;
          padding: 6px;
          list-style: none;
          overflow-y: auto;
        }
        .yt-list li a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 8px;
          color: #fff;
          text-decoration: none;
          transition: background 0.2s ease;
        }
        .yt-list li a:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .yt-list img {
          width: 120px;
          height: 68px;
          flex-shrink: 0;
          object-fit: cover;
          border-radius: 6px;
        }
        .yt-video-title {
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .yt-ext {
          font-size: 12px;
          opacity: 0.6;
        }
        .yt-full-link {
          display: block;
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--color-secondary);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .yt-full-link:hover {
          color: #fff;
        }
        @media (max-width: 991px) {
          .yt-list-wrap {
            height: auto;
            min-height: 0;
          }
          .yt-list {
            position: static;
            max-height: 420px;
          }
        }
      `}</style>
    </div>
  );
};

export default YoutubeVideos;
