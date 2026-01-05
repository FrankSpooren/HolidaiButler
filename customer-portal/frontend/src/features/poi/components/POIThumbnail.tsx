import { useState, useEffect, useRef } from 'react';
import type { POI } from '../types/poi.types';

interface POIThumbnailProps {
  poi: POI;
  /** Size of thumbnail (default: '48px') */
  size?: string;
  /** CSS class name */
  className?: string;
  /** Fallback icon when no image available */
  fallbackIcon?: string;
}

/**
 * POIThumbnail - Compact image component for list items with intelligent fallback
 *
 * Priority order (with automatic fallback on error):
 * 1. Local images from images array (poi.images[0]) - most reliable
 * 2. thumbnail_url (external Google URLs - may fail with 403)
 * 3. Fallback icon
 *
 * Based on POIImage but optimized for small list thumbnails
 */
export function POIThumbnail({
  poi,
  size = '48px',
  className = '',
  fallbackIcon = '📍'
}: POIThumbnailProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const triedSourcesRef = useRef<Set<string>>(new Set());

  // Build prioritized list of image sources
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

    // Priority 2: thumbnail_url (external, may fail with 403)
    if (poi.thumbnail_url) {
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
        return true;
      }
    }

    // All sources exhausted - show fallback
    setImageSrc(null);
    setImageState('error');
    return false;
  };

  useEffect(() => {
    // Reset when POI changes
    triedSourcesRef.current = new Set();
    setImageState('loading');
    tryNextSource();
  }, [poi.id, poi.thumbnail_url, JSON.stringify(poi.images)]);

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    // Try next source instead of immediately showing fallback
    tryNextSource();
  };

  // Show image (loading or loaded)
  if (imageSrc && imageState !== 'error') {
    return (
      <img
        src={imageSrc}
        alt={poi.name}
        className={`poi-thumbnail ${className}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          objectFit: 'cover',
          borderRadius: '8px',
          background: '#f0f0f0'
        }}
      />
    );
  }

  // Fallback: Icon
  return (
    <span
      className={`poi-thumbnail-fallback ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4f766b, #608379)',
        borderRadius: '8px',
        fontSize: '20px'
      }}
    >
      {fallbackIcon}
    </span>
  );
}
