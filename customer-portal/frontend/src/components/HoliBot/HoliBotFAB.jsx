/**
 * HoliBot FAB - Floating Action Button
 * Triggers the chat widget
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fab, useTheme } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useHoliBot } from '../../contexts/HoliBotContext';

const HoliBotFAB = () => {
  const theme = useTheme();
  const { isOpen, toggle } = useHoliBot();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
          }}
        >
          <Fab
            onClick={toggle}
            aria-label="Open HoliBot reisassistent"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            sx={{
              width: 64,
              height: 64,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.3)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <ChatIcon sx={{ fontSize: 28, color: 'white' }} />
          </Fab>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HoliBotFAB;
