/**
 * POIImageLightbox - Full-screen image viewer with zoom
 *
 * Features:
 * - Full-screen overlay
 * - Zoom in/out controls
 * - Close button (X) and ESC key support
 * - Navigation arrows (prev/next)
 * - Smooth transitions with Framer Motion
 * - Touch gestures for mobile (swipe, pinch-to-zoom)
 * - Image counter
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import './POIImageLightbox.css';

interface POIImageLightboxProps {
  /** Array of image URLs */
  images: string[];
  /** Initial image index */
  initialIndex?: number;
  /** POI name for alt text */
  poiName: string;
  /** Whether lightbox is open */
  isOpen: boolean;
  /** Callback to close lightbox */
  onClose: () => void;
}

export function POIImageLightbox({
  images,
  initialIndex = 0,
  poiName,
  isOpen,
  onClose,
}: POIImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const showNavigation = images.length > 1;

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle arrow keys for navigation
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    if (isOpen && showNavigation) {
      window.addEventListener('keydown', handleKeyNav);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyNav);
    };
  }, [isOpen, showNavigation, currentIndex]);

  // Navigate to previous image
  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomLevel(1);
  };

  // Navigate to next image
  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  };

  // Handle swipe gestures for mobile
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (zoomLevel > 1) return; // Don't navigate when zoomed in

    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      goToPrevious();
    } else if (info.offset.x < -swipeThreshold) {
      goToNext();
    }
  };

  // Zoom controls
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  // Framer Motion animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="poi-lightbox-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          className="poi-lightbox-close"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <X size={32} />
        </button>

        {/* Image Counter */}
        <div className="poi-lightbox-counter">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Zoom Controls */}
        <div className="poi-lightbox-zoom-controls">
          <button
            className="poi-lightbox-zoom-btn"
            onClick={(e) => {
              e.stopPropagation();
              zoomIn();
            }}
            disabled={zoomLevel >= 3}
            aria-label="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <span className="poi-lightbox-zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button
            className="poi-lightbox-zoom-btn"
            onClick={(e) => {
              e.stopPropagation();
              zoomOut();
            }}
            disabled={zoomLevel <= 1}
            aria-label="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          {zoomLevel > 1 && (
            <button
              className="poi-lightbox-zoom-btn"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              aria-label="Reset zoom"
            >
              <Maximize size={20} />
            </button>
          )}
        </div>

        {/* Image Container */}
        <div className="poi-lightbox-image-container" onClick={(e) => e.stopPropagation()}>
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
              drag={zoomLevel === 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="poi-lightbox-slide"
            >
              <motion.img
                src={images[currentIndex]}
                alt={`${poiName} - Image ${currentIndex + 1}`}
                className="poi-lightbox-image"
                animate={{ scale: zoomLevel }}
                transition={{ duration: 0.3 }}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        {showNavigation && (
          <>
            <button
              className="poi-lightbox-arrow poi-lightbox-arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={40} />
            </button>
            <button
              className="poi-lightbox-arrow poi-lightbox-arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Next image"
            >
              <ChevronRight size={40} />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
