/**
 * HoliBot Input Area - Text input with send button
 */

import React, { useState } from 'react';
import { Box, TextField, IconButton, useTheme } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useHoliBot } from '../../contexts/HoliBotContext';

const HoliBotInputArea = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { sendMessage, isLoading } = useHoliBot();
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!message.trim() || isLoading) return;

    await sendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'white',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('holibot.placeholder', 'Stel een vraag...')}
        aria-label={t('holibot.placeholder', 'Stel een vraag...')}
        disabled={isLoading}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'grey.50',
          },
        }}
        inputProps={{
          maxLength: 500,
        }}
      />

      <IconButton
        type="submit"
        disabled={!message.trim() || isLoading}
        sx={{
          bgcolor: theme.palette.primary.main,
          color: 'white',
          width: 44,
          height: 44,
          '&:hover': {
            bgcolor: theme.palette.primary.dark,
          },
          '&:disabled': {
            bgcolor: 'grey.200',
            color: 'grey.400',
          },
        }}
        aria-label={t('holibot.send', 'Versturen')}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
};

export default HoliBotInputArea;
