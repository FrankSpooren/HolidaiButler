/**
 * POIAirbnbGallery - Adaptive image gallery for POI Detail
 * Renders different layouts based on number of available images
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Images } from "lucide-react";
import "./POIAirbnbGallery.css";

interface POIAirbnbGalleryProps {
  images: string[];
  thumbnailUrl?: string | null;
  poiName: string;
  categoryColor: string;
  categoryIcon: string;
  onShowAll?: () => void;
  onImageClick?: (index: number) => void;
}

export function POIAirbnbGallery({
  images,
  thumbnailUrl,
  poiName,
  categoryColor,
  categoryIcon,
  onShowAll,
  onImageClick
}: POIAirbnbGalleryProps) {
  // Only use real images, no fallbacks
  const realImages = images && images.length > 0 ? images : thumbnailUrl ? [thumbnailUrl] : [];
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [mobileIndex, setMobileIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Filter out failed images
  const displayImages = realImages.filter((_, idx) => !failedImages.has(idx));
  const imageCount = displayImages.length;
  const totalImages = realImages.length;

  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  }, []);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && mobileIndex > 0) {
      setDirection(-1);
      setMobileIndex(prev => prev - 1);
    } else if (info.offset.x < -threshold && mobileIndex < displayImages.length - 1) {
      setDirection(1);
      setMobileIndex(prev => prev + 1);
    }
  }, [mobileIndex, displayImages.length]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0.5 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0.5 }),
  };

  // No images - show fallback
  if (imageCount === 0) {
    return (
      <div className="poi-gallery-fallback" style={{ background: categoryColor }}>
        <div className="poi-gallery-fallback-overlay" />
        <img src={categoryIcon} alt={poiName} className="poi-gallery-fallback-icon" />
        <span className="poi-gallery-fallback-text">No photos available</span>
      </div>
    );
  }

  // Determine layout class based on image count
  const getLayoutClass = () => {
    if (imageCount === 1) return "layout-1";
    if (imageCount === 2) return "layout-2";
    if (imageCount === 3) return "layout-3";
    if (imageCount === 4) return "layout-4";
    return "layout-5";
  };

  const renderShowAllButton = () => {
    if (!onShowAll || totalImages <= 1) return null;
    return (
      <button className="poi-gallery-show-all" onClick={onShowAll}>
        <Images size={16} />
        <span>{"Show all photos (" + totalImages + ")"}</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Grid - Adaptive Layout */}
      <div className={"poi-gallery-grid " + getLayoutClass()}>
        {displayImages.slice(0, 5).map((img, idx) => (
          <div
            key={idx}
            className={"poi-gallery-item item-" + (idx + 1)}
            onClick={() => onImageClick?.(idx)}
          >
            <img
              src={img}
              alt={poiName + " - Photo " + (idx + 1)}
              loading={idx === 0 ? "eager" : "lazy"}
              onError={() => handleImageError(realImages.indexOf(img))}
            />
          </div>
        ))}
        {renderShowAllButton()}
      </div>

      {/* Mobile Carousel */}
      <div className="poi-gallery-mobile">
        <div className="poi-gallery-mobile-viewport">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={mobileIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="poi-gallery-mobile-slide"
              onClick={() => onImageClick?.(mobileIndex)}
            >
              <img
                src={displayImages[mobileIndex]}
                alt={poiName}
                loading="lazy"
                onError={() => handleImageError(realImages.indexOf(displayImages[mobileIndex]))}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Counter removed per user request - dots provide sufficient navigation feedback */}
        <div className="poi-gallery-mobile-dots">
          {displayImages.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              className={"poi-gallery-mobile-dot" + (idx === mobileIndex ? " active" : "")}
              onClick={(e) => {
                e.stopPropagation();
                setDirection(idx > mobileIndex ? 1 : -1);
                setMobileIndex(idx);
              }}
            />
          ))}
          {displayImages.length > 5 && (
            <span className="poi-gallery-mobile-more">{"+ " + (displayImages.length - 5)}</span>
          )}
        </div>
        {onShowAll && totalImages > 1 && (
          <button className="poi-gallery-mobile-show-all" onClick={onShowAll}>
            <Images size={14} />
            <span>{"All (" + totalImages + ")"}</span>
          </button>
        )}
      </div>
    </>
  );
}

export default POIAirbnbGallery;
