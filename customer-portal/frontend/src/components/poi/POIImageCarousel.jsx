/**
 * POI Image Carousel Component
 * Animated image carousel with Framer Motion for POI detail pages
 *
 * Features:
 * - Smooth slide transitions with spring physics
 * - Touch/swipe gestures for mobile
 * - Keyboard navigation (Arrow keys)
 * - Thumbnail strip navigation
 * - Click to open lightbox
 * - Fallback handling for failed images
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ZoomIn as ZoomInIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { slideVariants, springTransition, getSwipeDirection } from '../../utils/animations';

const POIImageCarousel = ({
  images = [],
  thumbnailUrl = null,
  poiName = 'POI',
  onImageClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Prepare image array
  const imageArray = images.length > 0 ? images : thumbnailUrl ? [thumbnailUrl] : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());

  const hasImages = imageArray.length > 0;
  const showNavigation = imageArray.length > 1;

  // Navigation functions
  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Handle swipe gestures
  const handleDragEnd = (event, info) => {
    const swipeDir = getSwipeDirection(info, 50);
    if (swipeDir === 'right') goToPrevious();
    if (swipeDir === 'left') goToNext();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    else if (e.key === 'ArrowRight') goToNext();
    else if (e.key === 'Enter' && onImageClick) onImageClick(currentIndex);
  };

  // Handle image errors
  const handleImageError = (index) => {
    setFailedImages((prev) => new Set(prev).add(index));
  };

  const hasCurrentImageFailed = failedImages.has(currentIndex);
  const allImagesFailed = imageArray.length > 0 && failedImages.size === imageArray.length;

  // No images fallback
  if (!hasImages || allImagesFailed) {
    return (
      <Box
        sx={{
          width: '100%',
          height: { xs: 250, sm: 350, md: 450 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 2,
          gap: 2,
        }}
      >
        <ImageIcon sx={{ fontSize: 64, color: 'grey.400' }} />
        <Box sx={{ color: 'grey.500', fontSize: '0.875rem' }}>
          {!hasImages ? 'No images available' : 'Images failed to load'}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{ width: '100%', outline: 'none' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Main Image Display */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 250, sm: 350, md: 450 },
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.900',
        }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
            drag="x"
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
              cursor: onImageClick ? 'pointer' : 'default',
            }}
          >
            {hasCurrentImageFailed ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  color: 'grey.400',
                }}
              >
                <ImageIcon sx={{ fontSize: 48 }} />
                <span>Image failed to load</span>
              </Box>
            ) : (
              <Box
                component="img"
                src={imageArray[currentIndex]}
                alt={`${poiName} - Image ${currentIndex + 1}`}
                onClick={() => onImageClick?.(currentIndex)}
                onError={() => handleImageError(currentIndex)}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dots Indicator */}
        {showNavigation && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
              zIndex: 10,
            }}
          >
            {imageArray.map((_, index) => (
              <Box
                key={index}
                onClick={() => goToImage(index)}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: index === currentIndex ? 'primary.main' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: index === currentIndex ? 'primary.main' : 'rgba(255,255,255,0.8)',
                  },
                }}
              />
            ))}
          </Box>
        )}

        {/* Zoom Button */}
        {onImageClick && (
          <IconButton
            onClick={() => onImageClick(currentIndex)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
            aria-label="Zoom image"
          >
            <ZoomInIcon />
          </IconButton>
        )}

        {/* Navigation Arrows */}
        {showNavigation && (
          <>
            <IconButton
              onClick={goToPrevious}
              sx={{
                position: 'absolute',
                left: { xs: 8, sm: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                zIndex: 10,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
              aria-label="Previous image"
            >
              <ChevronLeftIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
            <IconButton
              onClick={goToNext}
              sx={{
                position: 'absolute',
                right: { xs: 8, sm: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                zIndex: 10,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
              aria-label="Next image"
            >
              <ChevronRightIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </>
        )}

        {/* Image Counter */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.875rem',
            zIndex: 10,
          }}
        >
          {currentIndex + 1} / {imageArray.length}
        </Box>
      </Box>

      {/* Thumbnail Strip */}
      {showNavigation && !isMobile && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.300',
              borderRadius: 3,
            },
          }}
        >
          {imageArray.map((image, index) => (
            <Box
              key={index}
              onClick={() => goToImage(index)}
              sx={{
                flexShrink: 0,
                width: 80,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                border: 2,
                borderColor: index === currentIndex ? 'primary.main' : 'transparent',
                opacity: failedImages.has(index) ? 0.5 : 1,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: index === currentIndex ? 'primary.main' : 'grey.400',
                },
              }}
            >
              {failedImages.has(index) ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon sx={{ color: 'grey.400', fontSize: 24 }} />
                </Box>
              ) : (
                <Box
                  component="img"
                  src={image}
                  alt={`${poiName} thumbnail ${index + 1}`}
                  onError={() => handleImageError(index)}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default POIImageCarousel;
