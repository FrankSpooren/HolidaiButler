/**
 * POITileCarousel - Swipeable image carousel for POI tiles
 * 
 * Features:
 * - Max 3 images with swipe navigation
 * - Dot indicators
 * - Touch-friendly (no arrows on mobile)
 * - Fallback to category icon
 * - Lazy loading
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { getImageSrcSet, IMAGE_SIZES_ATTR, getResizedImageUrl, IMAGE_SIZES } from '../../../shared/utils/imageUrl';
import './POITileCarousel.css';

interface POITileCarouselProps {
  /** Array of image URLs (max 3 displayed) */
  images: string[];
  /** Fallback thumbnail URL */
  thumbnailUrl?: string | null;
  /** POI name for alt text */
  poiName: string;
  /** Category color gradient for fallback */
  categoryColor: string;
  /** Category icon for fallback */
  categoryIcon: string;
  /** Height of carousel */
  height?: string;
  /** Click handler */
  onClick?: () => void;
}

export function POITileCarousel({
  images,
  thumbnailUrl,
  poiName,
  categoryColor,
  categoryIcon,
  height = '200px',
  onClick
}: POITileCarouselProps) {
  // Prepare images array (max 3)
  const displayImages = images && images.length > 0 
    ? images.slice(0, 3)
    : thumbnailUrl 
    ? [thumbnailUrl]
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const hasImages = displayImages.length > 0;
  const showDots = displayImages.length > 1;

  // Navigate to specific image
  const goToImage = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold && currentIndex > 0) {
      goToImage(currentIndex - 1);
    } else if (info.offset.x < -swipeThreshold && currentIndex < displayImages.length - 1) {
      goToImage(currentIndex + 1);
    }
  }, [currentIndex, displayImages.length, goToImage]);

  // Handle image load errors
  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  }, []);

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0.5,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0.5,
    }),
  };

  // No images - show fallback
  if (!hasImages || failedImages.size === displayImages.length) {
    return (
      <div
        className="poi-tile-carousel-fallback"
        style={{ height, background: categoryColor }}
        onClick={onClick}
      >
        <div className="poi-tile-carousel-fallback-overlay" />
        <img
          src={categoryIcon}
          alt={poiName}
          className="poi-tile-carousel-fallback-icon"
        />
      </div>
    );
  }

  return (
    <div 
      className="poi-tile-carousel"
      style={{ height }}
      onClick={onClick}
    >
      {/* Main image area */}
      <div className="poi-tile-carousel-viewport">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={displayImages.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="poi-tile-carousel-slide"
          >
            {failedImages.has(currentIndex) ? (
              <div
                className="poi-tile-carousel-fallback-inline"
                style={{ background: categoryColor }}
              >
                <img src={categoryIcon} alt={poiName} />
              </div>
            ) : (
              <img
                src={getResizedImageUrl(displayImages[currentIndex], IMAGE_SIZES.small)}
                srcSet={getImageSrcSet(displayImages[currentIndex], [IMAGE_SIZES.thumbnail, IMAGE_SIZES.small, IMAGE_SIZES.medium])}
                sizes={IMAGE_SIZES_ATTR.tile}
                alt={`${poiName} - Image ${currentIndex + 1}`}
                className="poi-tile-carousel-image"
                loading="lazy"
                decoding="async"
                onError={() => handleImageError(currentIndex)}
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Partial next image hint */}
        {showDots && currentIndex < displayImages.length - 1 && (
          <div className="poi-tile-carousel-peek-right" />
        )}
      </div>

      {/* Dot indicators - these replace the counter (cleaner UX) */}
      {showDots && (
        <div className="poi-tile-carousel-dots">
          {displayImages.map((_, index) => (
            <button
              key={index}
              className={`poi-tile-carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                goToImage(index);
              }}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default POITileCarousel;
