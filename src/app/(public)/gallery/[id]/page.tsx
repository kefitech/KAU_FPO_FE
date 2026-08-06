"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { publicFetch } from "../../_lib/public-fetch";

interface AlbumDetail {
  id: number;
  title: string;
  photos: {
    id: number;
    photo_url: string;
    caption: string;
    order: number;
  }[];
}

export default function GalleryAlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/gallery/albums/${id}/`)
      .then((r) => r.json())
      .then((json) => setAlbum(json.data as AlbumDetail))
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AgrulLayout>
      <BreadCrumb title={album?.title ?? "Gallery"} breadCrumb="Gallery" />

      <div className="gallery-album-area default-padding">
        <div className="container">
          {loading ? (
            <div className="gallery-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="gallery-skeleton" />
              ))}
            </div>
          ) : !album || album.photos.length === 0 ? (
            <div className="gallery-empty">
              <i className="fas fa-images" />
              <p>No photos in this album yet.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {album.photos.map((photo) => (
                <div key={photo.id} className="gallery-item" onClick={() => setLightbox(photo.photo_url)}>
                  <img src={photo.photo_url} alt={photo.caption || album.title} />
                  {photo.caption && <div className="gallery-item-caption">{photo.caption}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(null)}>
          <button className="gallery-lightbox-close" onClick={() => setLightbox(null)}>
            <i className="fas fa-times" />
          </button>
          <img src={lightbox} alt="Preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <style jsx>{`
        .gallery-album-area {
          padding: 80px 0 100px;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .gallery-item {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          aspect-ratio: 4/3;
          cursor: pointer;
          background: #f0f0f0;
        }
        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
          display: block;
        }
        .gallery-item:hover img {
          transform: scale(1.06);
        }
        .gallery-item-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 14px;
          background: linear-gradient(transparent, rgba(0,0,0,0.65));
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }
        .gallery-skeleton {
          aspect-ratio: 4/3;
          border-radius: 12px;
          background: #e8e8e8;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .gallery-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 0;
          color: #aaa;
          font-size: 16px;
        }
        .gallery-empty i {
          font-size: 48px;
          opacity: 0.4;
        }
        .gallery-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.92);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .gallery-lightbox img {
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
        }
        .gallery-lightbox-close {
          position: absolute;
          top: 20px;
          right: 24px;
          background: none;
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
        }
        .gallery-lightbox-close:hover {
          opacity: 1;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .gallery-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AgrulLayout>
  );
}
