/**
 * POI Image Lightbox Component
 * Full-screen image viewer with zoom and navigation
 *
 * Features:
 * - Full-screen overlay with blur backdrop
 * - Zoom in/out controls (up to 3x)
 * - Swipe navigation (disabled when zoomed)
 * - Keyboard navigation (Arrow keys, ESC to close)
 * - Smooth Framer Motion animations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, IconButton, Typography, Portal } from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CropFree as ResetZoomIcon,
} from '@mui/icons-material';
import {
  overlayVariants,
  slidePercentVariants,
  springTransition,
  getSwipeDirection,
} from '../../utils/animations';

const POIImageLightbox = ({
  images = [],
  initialIndex = 0,
  poiName = 'POI',
  isOpen = false,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const showNavigation = images.length > 1;

  // Reset state when initialIndex changes or lightbox opens
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle arrow key navigation
  useEffect(() => {
    const handleKeyNav = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
    };

    if (isOpen && showNavigation) {
      window.addEventListener('keydown', handleKeyNav);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyNav);
    };
  }, [isOpen, showNavigation, currentIndex]);

  // Navigation functions
  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomLevel(1);
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  };

  // Handle swipe gestures (only when not zoomed)
  const handleDragEnd = (event, info) => {
    if (zoomLevel > 1) return;

    const swipeDir = getSwipeDirection(info, 100);
    if (swipeDir === 'right') goToPrevious();
    if (swipeDir === 'left') goToNext();
  };

  // Zoom controls
  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  const resetZoom = () => setZoomLevel(1);

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          key="lightbox-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
            aria-label="Close lightbox"
          >
            <CloseIcon fontSize="large" />
          </IconButton>

          {/* Image Counter */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              color: 'white',
              fontSize: '1rem',
              fontWeight: 500,
              zIndex: 10,
            }}
          >
            {currentIndex + 1} / {images.length}
          </Box>

          {/* Zoom Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: 2,
              px: 2,
              py: 1,
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              onClick={zoomOut}
              disabled={zoomLevel <= 1}
              sx={{
                color: 'white',
                '&:disabled': { color: 'grey.600' },
              }}
              size="small"
              aria-label="Zoom out"
            >
              <ZoomOutIcon />
            </IconButton>
            <Typography sx={{ color: 'white', minWidth: 50, textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </Typography>
            <IconButton
              onClick={zoomIn}
              disabled={zoomLevel >= 3}
              sx={{
                color: 'white',
                '&:disabled': { color: 'grey.600' },
              }}
              size="small"
              aria-label="Zoom in"
            >
              <ZoomInIcon />
            </IconButton>
            {zoomLevel > 1 && (
              <IconButton
                onClick={resetZoom}
                sx={{ color: 'white' }}
                size="small"
                aria-label="Reset zoom"
              >
                <ResetZoomIcon />
              </IconButton>
            )}
          </Box>

          {/* Image Container */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slidePercentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springTransition}
                drag={zoomLevel === 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <motion.img
                  src={images[currentIndex]}
                  alt={`${poiName} - Image ${currentIndex + 1}`}
                  animate={{ scale: zoomLevel }}
                  transition={{ duration: 0.3 }}
                  draggable={false}
                  style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    cursor: zoomLevel > 1 ? 'grab' : 'default',
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </Box>

          {/* Navigation Arrows */}
          {showNavigation && (
            <>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                sx={{
                  position: 'absolute',
                  left: { xs: 8, sm: 24 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  zIndex: 10,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
                aria-label="Previous image"
              >
                <ChevronLeftIcon fontSize="large" />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                sx={{
                  position: 'absolute',
                  right: { xs: 8, sm: 24 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  zIndex: 10,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
                aria-label="Next image"
              >
                <ChevronRightIcon fontSize="large" />
              </IconButton>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

export default POIImageLightbox;
