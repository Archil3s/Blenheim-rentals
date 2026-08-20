"use client";

import { useEffect, useRef, useState } from "react";
import type { Rental } from "@/lib/rentals/types";

function initialPhotos(rental: Rental) {
  return rental.imageUrls?.length
    ? rental.imageUrls
    : rental.imageUrl
      ? [rental.imageUrl]
      : [];
}

export function RentalPhotoGallery({ rental }: { rental: Rental }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [photos, setPhotos] = useState<string[]>(() => initialPhotos(rental));

  useEffect(() => {
    setPhotos(initialPhotos(rental));
    requestedRef.current = false;
  }, [rental.id]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || requestedRef.current) return;

    let cancelled = false;

    const loadFullGallery = async () => {
      if (requestedRef.current) return;
      requestedRef.current = true;

      try {
        const response = await fetch(`/api/rental-images?id=${encodeURIComponent(rental.id)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { imageUrls?: string[] };
        if (!Array.isArray(payload.imageUrls) || cancelled) return;

        setPhotos((current) => {
          const merged = [...new Set([...current, ...payload.imageUrls!].filter(Boolean))];
          return merged.length > current.length ? merged : current;
        });
      } catch {
        // Keep the search-page photos if detail-page enrichment is unavailable.
      }
    };

    if (!("IntersectionObserver" in window)) {
      void loadFullGallery();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadFullGallery();
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(wrapper);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [rental.id]);

  const movePhoto = (direction: -1 | 1) => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    gallery.scrollBy({
      left: direction * gallery.clientWidth,
      behavior: "smooth",
    });
  };

  if (photos.length === 0) {
    return (
      <div ref={wrapperRef} className="rental-photo-empty">
        <span>🏠</span>
        <div className="source-pill">{rental.source}</div>
      </div>
    );
  }

  const arrowStyle = {
    position: "absolute" as const,
    top: "50%",
    zIndex: 4,
    display: "grid",
    width: 46,
    height: 46,
    placeItems: "center",
    transform: "translateY(-50%)",
    border: "1px solid rgba(20, 61, 42, 0.18)",
    borderRadius: 999,
    color: "#143d2a",
    background: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 5px 18px rgba(0, 0, 0, 0.2)",
    fontSize: "2rem",
    fontWeight: 800,
    lineHeight: 1,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div ref={galleryRef} className="photo-gallery" aria-label={`Photos of ${rental.address}`}>
        {photos.map((photo, index) => (
          <div className="photo-slide" key={`${photo}-${index}`}>
            <img src={photo} alt={`${rental.address} photo ${index + 1}`} loading="lazy" />
            {index === 0 && <div className="source-pill">{rental.source}</div>}
            {photos.length > 1 && (
              <span className="photo-count">
                {index + 1}/{photos.length}
              </span>
            )}
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label={`Previous photo of ${rental.address}`}
            title="Previous photo"
            onClick={() => movePhoto(-1)}
            style={{ ...arrowStyle, left: 10 }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={`Next photo of ${rental.address}`}
            title="Next photo"
            onClick={() => movePhoto(1)}
            style={{ ...arrowStyle, right: 10 }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
