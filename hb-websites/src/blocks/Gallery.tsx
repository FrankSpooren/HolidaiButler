'use client';

import { useState, useCallback, useEffect } from 'react';
import type { GalleryProps } from '@/types/blocks';

export default function Gallery({ images, columns = 3, layout = 'grid' }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);

  const goPrev = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

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

  if (!images || images.length === 0) return null;

  const gridCols =
    columns === 2 ? 'sm:grid-cols-2' :
    columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {images.map((img, idx) => (
          <button
            key={idx}
            className={`relative overflow-hidden rounded-tenant cursor-pointer group ${
              layout === 'masonry' && idx % 3 === 0 ? 'row-span-2' : ''
            }`}
            onClick={() => openLightbox(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt ?? ''}
              loading="lazy"
              className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-300"
            />
            {img.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-sm px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {img.caption}
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
            aria-label="Previous image"
          >
            &#8249;
          </button>

          <div className="max-w-5xl max-h-[85vh] px-12" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt ?? ''}
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            {images[lightboxIndex].caption && (
              <p className="text-white text-center mt-3 text-sm">
                {images[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white/60 text-center mt-1 text-xs">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 z-10"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next image"
          >
            &#8250;
          </button>
        </div>
      )}
    </section>
  );
}
