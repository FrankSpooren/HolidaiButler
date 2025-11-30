/**
 * HoliBot Chat Window - Main chat modal
 * Contains header, message list, and input area
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Portal,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as ClearIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useHoliBot } from '../../contexts/HoliBotContext';
import HoliBotMessageList from './HoliBotMessageList';
import HoliBotInputArea from './HoliBotInputArea';
import HoliBotQuickReplies from './HoliBotQuickReplies';

const HoliBotChatWindow = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isOpen, close, messages, clearMessages } = useHoliBot();
  const containerRef = useRef(null);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 1299,
              }}
            />

            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                bottom: isMobile ? 0 : 24,
                right: isMobile ? 0 : 24,
                zIndex: 1300,
                width: isMobile ? '100%' : 400,
                height: isMobile ? '100%' : 600,
                maxHeight: isMobile ? '100%' : 'calc(100vh - 48px)',
              }}
            >
              <Paper
                ref={containerRef}
                elevation={24}
                role="dialog"
                aria-modal="true"
                aria-labelledby="holibot-title"
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: isMobile ? 0 : 3,
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    color: 'white',
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `3px solid ${theme.palette.secondary.main}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BotIcon />
                    </Box>
                    <Box>
                      <Typography
                        id="holibot-title"
                        variant="subtitle1"
                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                      >
                        HoliBot
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {t('holibot.greeting', 'Je persoonlijke reisassistent')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    {messages.length > 0 && (
                      <IconButton
                        onClick={clearMessages}
                        sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
                        aria-label="Wis gesprek"
                        size="small"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={close}
                      sx={{ color: 'white' }}
                      aria-label="Sluit chat"
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Message List */}
                <HoliBotMessageList />

                {/* Quick Replies (shown when no messages) */}
                {messages.length === 0 && <HoliBotQuickReplies />}

                {/* Input Area */}
                <HoliBotInputArea />
              </Paper>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default HoliBotChatWindow;
