/**
 * POIImageCarousel - Enterprise-grade image carousel for POI Detail Page
 *
 * Features:
 * - Main large image display
 * - Thumbnail strip navigation
 * - Navigation arrows (prev/next)
 * - Image counter (e.g., "3 / 8")
 * - Touch gestures for mobile (swipe)
 * - Click to open lightbox (full-screen zoom)
 * - Smooth transitions with Framer Motion
 * - Fallback to category icon if no images
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../../../shared/config/categoryConfig';
import './POIImageCarousel.css';

interface POIImageCarouselProps {
  /** Array of image URLs */
  images: string[] | null;
  /** Fallback thumbnail URL */
  thumbnailUrl: string | null;
  /** POI name for alt text */
  poiName: string;
  /** POI category for fallback icon */
  category: string;
  /** Callback when image is clicked (opens lightbox) */
  onImageClick?: (index: number) => void;
}

export function POIImageCarousel({
  images,
  thumbnailUrl,
  poiName,
  category,
  onImageClick,
}: POIImageCarouselProps) {
  // Prepare image array (use images array, or single thumbnail, or empty array)
  const imageArray = images && images.length > 0
    ? images
    : thumbnailUrl
    ? [thumbnailUrl]
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const hasImages = imageArray.length > 0;
  const showNavigation = imageArray.length > 1;

  // Navigate to previous image
  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1));
  };

  // Navigate to next image
  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1));
  };

  // Navigate to specific image (thumbnail click)
  const goToImage = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Handle swipe gestures for mobile
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      goToPrevious();
    } else if (info.offset.x < -swipeThreshold) {
      goToNext();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'Enter' && onImageClick) {
      onImageClick(currentIndex);
    }
  };

  // Handle image load errors
  const handleImageError = (index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  };

  // Check if current image has failed to load
  const hasCurrentImageFailed = failedImages.has(currentIndex);
  const allImagesFailed = imageArray.length > 0 && failedImages.size === imageArray.length;

  // Framer Motion animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // No images or all images failed - show category icon fallback
  if (!hasImages || allImagesFailed) {
    return (
      <div className="poi-carousel-fallback">
        <div
          className="poi-carousel-icon-placeholder"
          style={{ background: getCategoryColor(category) }}
        >
          <img
            src={getCategoryIcon(category)}
            alt={category}
            className="poi-carousel-category-icon"
          />
        </div>
        <div className="poi-carousel-no-images-text">
          {!hasImages ? 'No images available' : 'Images failed to load'}
        </div>
      </div>
    );
  }

  return (
    <div className="poi-carousel-container" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Main Image Display */}
      <div className="poi-carousel-main">
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="poi-carousel-slide"
          >
            {hasCurrentImageFailed ? (
              // Show category icon fallback for failed image
              <div
                className="poi-carousel-image-fallback"
                style={{ background: getCategoryColor(category) }}
              >
                <img
                  src={getCategoryIcon(category)}
                  alt={category}
                  className="poi-carousel-category-icon"
                />
                <div className="poi-carousel-error-text">Image failed to load</div>
              </div>
            ) : (
              <img
                src={imageArray[currentIndex]}
                alt={`${poiName} - Image ${currentIndex + 1}`}
                className="poi-carousel-image"
                onClick={() => onImageClick?.(currentIndex)}
                onError={() => handleImageError(currentIndex)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Image Dots Indicator */}
        {showNavigation && (
          <div className="poi-carousel-dots">
            {imageArray.map((_, index) => (
              <button
                key={index}
                className={`poi-carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToImage(index)}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Zoom Hint */}
        {onImageClick && (
          <button
            className="poi-carousel-zoom-button"
            onClick={() => onImageClick(currentIndex)}
            aria-label="Zoom image"
          >
            <ZoomIn size={24} />
          </button>
        )}

        {/* Navigation Arrows */}
        {showNavigation && (
          <>
            <button
              className="poi-carousel-arrow poi-carousel-arrow-left"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              className="poi-carousel-arrow poi-carousel-arrow-right"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {showNavigation && (
        <div className="poi-carousel-thumbnails">
          {imageArray.map((image, index) => (
            <button
              key={index}
              className={`poi-carousel-thumbnail ${index === currentIndex ? 'active' : ''} ${failedImages.has(index) ? 'failed' : ''}`}
              onClick={() => goToImage(index)}
              aria-label={`View image ${index + 1}`}
            >
              {failedImages.has(index) ? (
                <div className="poi-carousel-thumbnail-error">
                  <img
                    src={getCategoryIcon(category)}
                    alt={category}
                    className="poi-carousel-thumbnail-icon"
                  />
                </div>
              ) : (
                <img
                  src={image}
                  alt={`${poiName} thumbnail ${index + 1}`}
                  className="poi-carousel-thumbnail-image"
                  onError={() => handleImageError(index)}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
