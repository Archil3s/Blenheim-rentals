"use client";

import { useEffect } from "react";

type GalleryPayload = {
  imageUrls?: string[];
};

function normalizedUrl(value: string) {
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function applyGallery(gallery: HTMLElement, imageUrls: string[]) {
  const slides = Array.from(gallery.querySelectorAll<HTMLElement>(".photo-slide"));
  const existing = new Set(
    slides
      .map((slide) => slide.querySelector<HTMLImageElement>("img")?.src)
      .filter((value): value is string => Boolean(value))
      .map(normalizedUrl),
  );

  for (const imageUrl of imageUrls) {
    const normalized = normalizedUrl(imageUrl);
    if (!normalized || existing.has(normalized)) continue;

    const slide = document.createElement("div");
    slide.className = "photo-slide";

    const image = document.createElement("img");
    image.src = normalized;
    image.alt = "Rental property photo";
    image.loading = "lazy";
    image.draggable = false;

    slide.appendChild(image);
    gallery.appendChild(slide);
    existing.add(normalized);
  }

  const allSlides = Array.from(gallery.querySelectorAll<HTMLElement>(".photo-slide"));
  const total = allSlides.length;

  allSlides.forEach((slide, index) => {
    let count = slide.querySelector<HTMLElement>(".photo-count");
    if (total <= 1) {
      count?.remove();
      return;
    }

    if (!count) {
      count = document.createElement("span");
      count.className = "photo-count";
      slide.appendChild(count);
    }
    count.textContent = `${index + 1}/${total}`;
  });
}

export function PhotoGalleryEnricher() {
  useEffect(() => {
    const galleryCache = new Map<string, string[]>();
    const loading = new Set<string>();
    const observed = new WeakSet<Element>();

    const enrichCard = async (card: Element) => {
      const gallery = card.querySelector<HTMLElement>(".photo-gallery");
      const listingLink = card.querySelector<HTMLAnchorElement>(".listing-link");
      if (!gallery || !listingLink?.href) return;

      const listingUrl = listingLink.href;
      const cached = galleryCache.get(listingUrl);
      if (cached) {
        applyGallery(gallery, cached);
        return;
      }
      if (loading.has(listingUrl)) return;

      loading.add(listingUrl);
      try {
        const response = await fetch(`/api/rental-images?url=${encodeURIComponent(listingUrl)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as GalleryPayload;
        if (!Array.isArray(payload.imageUrls) || payload.imageUrls.length === 0) return;

        galleryCache.set(listingUrl, payload.imageUrls);
        applyGallery(gallery, payload.imageUrls);
      } catch {
        // Keep the search-page thumbnails if the detail page is unavailable.
      } finally {
        loading.delete(listingUrl);
      }
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          intersectionObserver.unobserve(entry.target);
          void enrichCard(entry.target);
        }
      },
      { rootMargin: "350px 0px" },
    );

    const scanCards = () => {
      document.querySelectorAll<HTMLElement>(".rental-card").forEach((card) => {
        const gallery = card.querySelector<HTMLElement>(".photo-gallery");
        const listingUrl = card.querySelector<HTMLAnchorElement>(".listing-link")?.href;
        if (!gallery || !listingUrl) return;

        const cached = galleryCache.get(listingUrl);
        if (cached) {
          const currentCount = gallery.querySelectorAll(".photo-slide").length;
          if (currentCount < cached.length) applyGallery(gallery, cached);
          return;
        }

        if (!observed.has(card)) {
          observed.add(card);
          intersectionObserver.observe(card);
        }
      });
    };

    scanCards();
    const mutationObserver = new MutationObserver(scanCards);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return null;
}
