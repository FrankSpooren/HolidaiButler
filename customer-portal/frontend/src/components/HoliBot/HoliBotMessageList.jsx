/**
 * HoliBot Message List - Displays chat message history
 */

import React, { useRef, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useHoliBot } from '../../contexts/HoliBotContext';
import HoliBotMessage from './HoliBotMessage';

const HoliBotMessageList = () => {
  const { messages, isLoading } = useHoliBot();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'grey.50',
      }}
    >
      {messages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Welkom! Stel me een vraag over de Costa Blanca - restaurants, stranden,
            activiteiten, of waar dan ook!
          </Typography>
        </Box>
      ) : (
        messages.map((message) => (
          <HoliBotMessage key={message.id} message={message} />
        ))
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 6 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Even nadenken...
          </Typography>
        </Box>
      )}

      <div ref={messagesEndRef} />
    </Box>
  );
};

export default HoliBotMessageList;
