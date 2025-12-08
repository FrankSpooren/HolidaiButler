import { useState, useEffect } from 'react';
import type { POI } from '../types/poi.types';

interface POIImageProps {
  poi: POI;
  /** Height of image container (default: '200px') */
  height?: string;
  /** Category color gradient for fallback */
  categoryColor: string;
  /** Category icon image path for fallback */
  categoryIcon: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * POIImage - Enterprise image component with intelligent fallback
 *
 * Priority order:
 * 1. Database images array (poi.images[0])
 * 2. Category gradient + icon fallback
 *
 * Features:
 * - Lazy loading (native loading="lazy")
 * - Error handling (fallback on failed load)
 * - Loading skeleton
 * - Optimized rendering
 */
export function POIImage({
  poi,
  height = '200px',
  categoryColor,
  categoryIcon,
  className = ''
}: POIImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgKey, setImgKey] = useState(0); // Force remount on URL change

  useEffect(() => {
    // Reset state when POI changes
    setImageState('loading');
    setImgKey(prev => prev + 1);

    // Priority 1: thumbnail_url (from database)
    if (poi.thumbnail_url) {
      setImageSrc(poi.thumbnail_url);
      return;
    }

    // Priority 2: images array (backward compatibility)
    if (poi.images && poi.images.length > 0 && poi.images[0]) {
      setImageSrc(poi.images[0]);
      return;
    }

    // No images available, use fallback immediately
    setImageSrc(null);
    setImageState('error');
  }, [poi.id, poi.thumbnail_url, poi.images]); // Add poi.id to force reset

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    console.warn(`Image failed to load for POI ${poi.id}:`, imageSrc);
    setImageState('error');
  };

  // Show loading skeleton while image loads
  if (imageState === 'loading' && imageSrc) {
    return (
      <div
        className={`poi-image-container ${className}`}
        style={{
          height,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px 8px 0 0'
        }}
      >
        {/* Loading skeleton */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        {/* Actual image loading in background */}
        <img
          key={imgKey}
          src={imageSrc}
          alt={poi.name}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0
          }}
        />
        <style>
          {`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}
        </style>
      </div>
    );
  }

  // Show loaded image
  if (imageState === 'loaded' && imageSrc) {
    return (
      <div
        className={`poi-image-container ${className}`}
        style={{
          height,
          overflow: 'hidden',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <img
          key={imgKey}
          src={imageSrc}
          alt={poi.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>
    );
  }

  // Fallback: Category gradient + icon
  return (
    <div
      className={`poi-image-fallback ${className}`}
      style={{
        height,
        background: categoryColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle pattern overlay for visual interest */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      {/* Category Icon Image */}
      <img
        src={categoryIcon}
        alt={poi.category}
        style={{
          width: '64px',
          height: '64px',
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  );
}
