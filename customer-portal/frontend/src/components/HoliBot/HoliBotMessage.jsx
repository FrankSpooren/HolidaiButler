/**
 * HoliBot Message - Individual chat message display
 */

import React from 'react';
import { Box, Typography, Avatar, useTheme } from '@mui/material';
import { SmartToy as BotIcon, Person as PersonIcon } from '@mui/icons-material';

const HoliBotMessage = ({ message }) => {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1,
        alignItems: 'flex-start',
      }}
      role="article"
      aria-label={isUser ? 'Jouw bericht' : 'HoliBot antwoord'}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: isUser ? theme.palette.secondary.main : theme.palette.primary.main,
        }}
      >
        {isUser ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
      </Avatar>

      {/* Message Content */}
      <Box sx={{ maxWidth: '75%' }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: isUser ? theme.palette.secondary.main : 'white',
            color: isUser ? 'white' : 'text.primary',
            boxShadow: isAssistant ? 1 : 'none',
            borderTopRightRadius: isUser ? 4 : 16,
            borderTopLeftRadius: isUser ? 16 : 4,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.5,
            }}
          >
            {message.content}
          </Typography>

          {/* POI mentions */}
          {isAssistant && message.pois && message.pois.length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Gevonden locaties:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {message.pois.slice(0, 5).map((poi) => (
                  <Box
                    key={poi.id}
                    sx={{
                      px: 1,
                      py: 0.25,
                      bgcolor: 'primary.50',
                      color: 'primary.main',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.100' },
                    }}
                    onClick={() => {
                      // Navigate to POI detail
                      window.location.href = `/poi/${poi.id}`;
                    }}
                  >
                    {poi.name}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'text.secondary',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {time}
        </Typography>
      </Box>
    </Box>
  );
};

export default HoliBotMessage;
