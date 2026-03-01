import { useState, useEffect, useRef } from 'react';
import type { POI } from '../types/poi.types';
import { getResizedImageUrl, getImageSrcSet, IMAGE_SIZES_ATTR, IMAGE_SIZES } from '../../../shared/utils/imageUrl';

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
 * Priority order (with automatic fallback on error):
 * 1. Local images from images array (poi.images[0]) - most reliable
 * 2. thumbnail_url (external Google URLs - may fail with 403)
 * 3. Category gradient + icon fallback
 *
 * Features:
 * - Lazy loading (native loading="lazy")
 * - Cascading error handling (tries next source on failure)
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
  const [imgKey, setImgKey] = useState(0);
  const triedSourcesRef = useRef<Set<string>>(new Set());

  // Build prioritized list of image sources
  // Prefer local images (test.holidaibutler.com) over external Google URLs
  const getImageSources = (): string[] => {
    const sources: string[] = [];
    
    // Priority 1: Local images from images array (most reliable)
    if (poi.images && poi.images.length > 0) {
      poi.images.forEach(img => {
        if (img && typeof img === 'string') {
          sources.push(img);
        }
      });
    }
    
    // Priority 2: thumbnail_url (external, may fail)
    if (poi.thumbnail_url) {
      // Add thumbnail_url at the end as fallback (gps-cs-s URLs often fail)
      sources.push(poi.thumbnail_url);
    }
    
    return sources;
  };

  // Try next available image source
  const tryNextSource = () => {
    const sources = getImageSources();
    
    for (const src of sources) {
      if (!triedSourcesRef.current.has(src)) {
        triedSourcesRef.current.add(src);
        setImageSrc(src);
        setImageState('loading');
        setImgKey(prev => prev + 1);
        return true;
      }
    }
    
    // All sources exhausted
    setImageSrc(null);
    setImageState('error');
    return false;
  };

  useEffect(() => {
    // Reset when POI changes
    triedSourcesRef.current = new Set();
    setImageState('loading');
    
    // Try first source
    tryNextSource();
  }, [poi.id, poi.thumbnail_url, JSON.stringify(poi.images)]);

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    console.warn(`Image failed to load for POI ${poi.id}:`, imageSrc);
    // Try next source instead of immediately showing fallback
    tryNextSource();
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
          src={getResizedImageUrl(imageSrc, IMAGE_SIZES.medium)}
          srcSet={getImageSrcSet(imageSrc, [IMAGE_SIZES.small, IMAGE_SIZES.medium, IMAGE_SIZES.large])}
          sizes={IMAGE_SIZES_ATTR.tile}
          alt={poi.name}
          loading="lazy"
          decoding="async"
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
