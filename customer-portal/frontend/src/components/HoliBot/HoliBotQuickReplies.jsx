/**
 * HoliBot Quick Replies - Suggestion tiles for common queries
 */

import React from 'react';
import { Box, Chip, Typography, useTheme } from '@mui/material';
import {
  BeachAccess as BeachIcon,
  Restaurant as RestaurantIcon,
  ChildCare as ChildIcon,
  Museum as MuseumIcon,
  NightlifeOutlined as NightlifeIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { chatService } from '../../services';

const HoliBotQuickReplies = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { sendMessage } = useHoliBot();

  const suggestions = chatService.getQuickReplies(i18n.language);

  const icons = [BeachIcon, RestaurantIcon, ChildIcon, MuseumIcon, NightlifeIcon];

  const handleClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <Box
      sx={{
        px: 2,
        pb: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1 }}
      >
        {t('holibot.suggestions', 'Suggesties')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {suggestions.map((suggestion, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Chip
              key={index}
              icon={<Icon sx={{ fontSize: 18 }} />}
              label={suggestion}
              onClick={() => handleClick(suggestion)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: 'primary.200',
                color: 'primary.main',
                bgcolor: 'white',
                '&:hover': {
                  bgcolor: 'primary.50',
                  borderColor: 'primary.main',
                },
                '& .MuiChip-icon': {
                  color: 'primary.main',
                },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default HoliBotQuickReplies;
