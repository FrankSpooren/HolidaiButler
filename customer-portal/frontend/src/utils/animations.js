/**
 * Framer Motion Animation Variants & Utilities
 * Reusable animation configurations for HolidaiButler
 */

// =========================================================================
// Slide Animations (for carousels, page transitions)
// =========================================================================

/**
 * Directional slide animation - slides content in/out based on direction
 * Use with AnimatePresence and custom prop for direction
 */
export const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

/**
 * Percentage-based slide (for full-width slides)
 */
export const slidePercentVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

// =========================================================================
// Fade Animations
// =========================================================================

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeScaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// =========================================================================
// Modal/Overlay Animations
// =========================================================================

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

// =========================================================================
// Stagger Animations (for lists/grids)
// =========================================================================

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// =========================================================================
// Transition Presets
// =========================================================================

/**
 * Spring-based transition - natural, bouncy feel
 */
export const springTransition = {
  x: { type: 'spring', stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

/**
 * Smooth tween transition
 */
export const smoothTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/**
 * Fast transition for micro-interactions
 */
export const fastTransition = {
  duration: 0.15,
  ease: 'easeOut',
};

/**
 * Scale animation transition
 */
export const scaleTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// =========================================================================
// Hover/Tap Animations
// =========================================================================

export const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 },
};

export const tapScale = {
  scale: 0.98,
};

export const hoverLift = {
  y: -4,
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  transition: { duration: 0.2 },
};

// =========================================================================
// Drag Configuration
// =========================================================================

export const horizontalDragConfig = {
  drag: 'x',
  dragConstraints: { left: 0, right: 0 },
  dragElastic: 1,
};

// =========================================================================
// Page Transition Variants
// =========================================================================

export const pageVariants = {
  initial: { opacity: 0, x: -20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: 20 },
};

export const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

// =========================================================================
// Utility Functions
// =========================================================================

/**
 * Calculate swipe direction from drag info
 * @param {Object} info - PanInfo from framer-motion
 * @param {number} threshold - Minimum swipe distance
 * @returns {'left' | 'right' | null}
 */
export const getSwipeDirection = (info, threshold = 50) => {
  if (info.offset.x > threshold) return 'right';
  if (info.offset.x < -threshold) return 'left';
  return null;
};

/**
 * Check if device prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation props based on reduced motion preference
 * @param {Object} animationProps - Normal animation props
 * @param {Object} reducedProps - Reduced motion props
 * @returns {Object}
 */
export const getAccessibleAnimation = (animationProps, reducedProps = {}) => {
  return prefersReducedMotion() ? reducedProps : animationProps;
};
