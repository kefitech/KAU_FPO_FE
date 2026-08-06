"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { publicFetch } from "../../_lib/public-fetch";
import "./gallery-album.css";

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

    </AgrulLayout>
  );
}
