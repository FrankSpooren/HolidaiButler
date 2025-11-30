/**
 * Animated List Component
 * Container for staggered list/grid item animations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import { containerVariants, itemVariants } from '../../utils/animations';

/**
 * Container that staggers children animations
 */
const AnimatedList = ({ children, sx = {}, ...props }) => {
  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={sx}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * Item wrapper for staggered animation
 * Use inside AnimatedList for stagger effect
 */
const AnimatedListItem = ({ children, sx = {}, ...props }) => {
  return (
    <Box
      component={motion.div}
      variants={itemVariants}
      sx={sx}
      {...props}
    >
      {children}
    </Box>
  );
};

export { AnimatedList, AnimatedListItem };
export default AnimatedList;
