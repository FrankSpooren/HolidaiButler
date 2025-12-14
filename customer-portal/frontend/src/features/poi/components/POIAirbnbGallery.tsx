/**
 * POIAirbnbGallery - AirBnB-style image gallery for POI Detail
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
  const displayImages = images && images.length > 0 ? images : thumbnailUrl ? [thumbnailUrl] : [];
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [mobileIndex, setMobileIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const hasImages = displayImages.length > 0;
  const gridImages = displayImages.slice(0, 5);
  const totalImages = displayImages.length;

  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  }, []);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

  if (!hasImages || failedImages.size === displayImages.length) {
    return (
      <div className="poi-airbnb-gallery-fallback" style={{ background: categoryColor }}>
        <div className="poi-airbnb-gallery-fallback-overlay" />
        <img src={categoryIcon} alt={poiName} className="poi-airbnb-gallery-fallback-icon" />
        <span className="poi-airbnb-gallery-fallback-text">No photos available</span>
      </div>
    );
  }

  if (displayImages.length === 1) {
    return (
      <div className="poi-airbnb-gallery-single" onClick={() => onImageClick?.(0)}>
        <img src={displayImages[0]} alt={poiName} className="poi-airbnb-gallery-single-image" loading="lazy" onError={() => handleImageError(0)} />
        {onShowAll && (
          <button className="poi-airbnb-gallery-show-all" onClick={(e) => { e.stopPropagation(); onShowAll(); }}>
            <Images size={16} /><span>Show photo</span>
          </button>
        )}
      </div>
    );
  }

  const getSecondaryClass = (idx: number) => "poi-airbnb-gallery-secondary-item pos-" + idx;
  const getDotClass = (idx: number) => "poi-airbnb-gallery-mobile-dot" + (idx === mobileIndex ? " active" : "");

  return (
    <>
      <div className="poi-airbnb-gallery-grid">
        <div className="poi-airbnb-gallery-primary" onClick={() => onImageClick?.(0)}>
          {failedImages.has(0) ? (
            <div className="poi-airbnb-gallery-placeholder" style={{ background: categoryColor }}><img src={categoryIcon} alt={poiName} /></div>
          ) : (
            <img src={gridImages[0]} alt={poiName} loading="lazy" onError={() => handleImageError(0)} />
          )}
        </div>
        <div className="poi-airbnb-gallery-secondary">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className={getSecondaryClass(idx)} onClick={() => gridImages[idx] && onImageClick?.(idx)}>
              {gridImages[idx] ? (
                failedImages.has(idx) ? (
                  <div className="poi-airbnb-gallery-placeholder" style={{ background: categoryColor }}><img src={categoryIcon} alt={poiName} /></div>
                ) : (
                  <img src={gridImages[idx]} alt={poiName} loading="lazy" onError={() => handleImageError(idx)} />
                )
              ) : (
                <div className="poi-airbnb-gallery-placeholder" style={{ background: categoryColor }}><img src={categoryIcon} alt={poiName} /></div>
              )}
            </div>
          ))}
        </div>
        {onShowAll && totalImages > 1 && (
          <button className="poi-airbnb-gallery-show-all" onClick={onShowAll}>
            <Images size={16} /><span>Show all photos ({totalImages})</span>
          </button>
        )}
      </div>
      <div className="poi-airbnb-gallery-mobile">
        <div className="poi-airbnb-gallery-mobile-viewport">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div key={mobileIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}
              className="poi-airbnb-gallery-mobile-slide" onClick={() => onImageClick?.(mobileIndex)}>
              {failedImages.has(mobileIndex) ? (
                <div className="poi-airbnb-gallery-placeholder" style={{ background: categoryColor }}><img src={categoryIcon} alt={poiName} /></div>
              ) : (
                <img src={displayImages[mobileIndex]} alt={poiName} loading="lazy" onError={() => handleImageError(mobileIndex)} draggable={false} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="poi-airbnb-gallery-mobile-counter">{mobileIndex + 1} / {displayImages.length}</div>
        <div className="poi-airbnb-gallery-mobile-dots">
          {displayImages.slice(0, 5).map((_, idx) => (
            <button key={idx} className={getDotClass(idx)}
              onClick={(e) => { e.stopPropagation(); setDirection(idx > mobileIndex ? 1 : -1); setMobileIndex(idx); }} />
          ))}
          {displayImages.length > 5 && <span className="poi-airbnb-gallery-mobile-more">+{displayImages.length - 5}</span>}
        </div>
        {onShowAll && (
          <button className="poi-airbnb-gallery-mobile-show-all" onClick={onShowAll}>
            <Images size={14} /><span>All ({totalImages})</span>
          </button>
        )}
      </div>
    </>
  );
}

export default POIAirbnbGallery;
