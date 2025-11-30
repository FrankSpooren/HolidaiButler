/**
 * Animated Card Component
 * Reusable card with Framer Motion hover and entrance animations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@mui/material';
import { fadeUpVariants, hoverLift, tapScale, smoothTransition } from '../../utils/animations';

const AnimatedCard = ({
  children,
  delay = 0,
  enableHover = true,
  enableTap = true,
  sx = {},
  ...props
}) => {
  const hoverAnimation = enableHover ? hoverLift : {};
  const tapAnimation = enableTap ? tapScale : {};

  return (
    <Card
      component={motion.div}
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...smoothTransition, delay }}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      sx={{
        cursor: enableHover || enableTap ? 'pointer' : 'default',
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

export default AnimatedCard;
