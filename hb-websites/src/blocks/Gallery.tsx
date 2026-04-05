'use client';

import { useState, useCallback, useEffect } from 'react';
import type { GalleryProps, GalleryItem } from '@/types/blocks';
import { analytics } from '@/lib/analytics';

export default function Gallery({ images, items, columns = 3, layout = 'grid' }: GalleryProps) {
  // Backward compatible: convert images to items format
  const allItems: GalleryItem[] = items ?? (images ?? []).map(img => ({
    type: 'image' as const,
    url: img.src,
    alt: img.alt,
    caption: img.caption,
  }));

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (idx: number) => { analytics.gallery_opened(idx); setLightboxIndex(idx); };
  const closeLightbox = () => setLightboxIndex(null);

  const goPrev = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : allItems.length - 1));
  }, [allItems.length]);

  const goNext = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev < allItems.length - 1 ? prev + 1 : 0));
  }, [allItems.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, goPrev, goNext]);

  if (allItems.length === 0) return null;

  const gridCols =
    columns === 2 ? 'sm:grid-cols-2' :
    columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {allItems.map((item, idx) => (
          <button
            key={idx}
            className={`relative overflow-hidden rounded-tenant cursor-pointer group ${
              layout === 'masonry' && idx % 3 === 0 ? 'row-span-2' : ''
            }`}
            onClick={() => openLightbox(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.type === 'video' ? (item.thumbnailUrl ?? item.url) : item.url}
              alt={item.alt ?? ''}
              loading="lazy"
              className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-300"
            />
            {/* Video play icon overlay */}
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            {item.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-sm px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.caption}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:opacity-70 z-10"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            &times;
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 z-10"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous"
          >
            &#8249;
          </button>

          <div className="max-w-5xl max-h-[85vh] px-12" onClick={(e) => e.stopPropagation()}>
            {allItems[lightboxIndex].type === 'video' ? (
              <video
                src={allItems[lightboxIndex].url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] mx-auto"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={allItems[lightboxIndex].url}
                alt={allItems[lightboxIndex].alt ?? ''}
                className="max-w-full max-h-[80vh] object-contain mx-auto"
              />
            )}
            {allItems[lightboxIndex].caption && (
              <p className="text-white text-center mt-3 text-sm">
                {allItems[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white/60 text-center mt-1 text-xs">
              {lightboxIndex + 1} / {allItems.length}
            </p>
          </div>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 z-10"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next"
          >
            &#8250;
          </button>
        </div>
      )}
    </section>
  );
}
