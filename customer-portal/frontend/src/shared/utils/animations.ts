/**
 * Framer Motion Animation Presets
 * Reusable animation configurations for HolidaiButler
 *
 * From NEW: Tile hover effects, smooth transitions
 */

import type { Variants, Transition } from 'framer-motion';

// Default transition settings
export const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const smoothTransition: Transition = {
  type: 'tween',
  duration: 0.3,
  ease: 'easeOut',
};

// Card hover animation (POI cards, feature cards)
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: defaultTransition,
  },
  tap: {
    scale: 0.98,
  },
};

// Fade in animation for page content
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// Stagger children animation (for grids)
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

// Slide in from side animations
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};

export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};

// Scale up animation (for modals, popups)
export const scaleUpVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Button press animation
export const buttonPressVariants: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.95 },
  hover: { scale: 1.02 },
};

// Floating animation (for decorative elements)
export const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Pulse animation (for loading states, highlights)
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Page transition variants
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// List item animation with index-based delay
export const createListItemVariants = (index: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  },
});
