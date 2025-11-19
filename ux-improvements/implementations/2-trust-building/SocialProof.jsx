import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Whatshot as HotIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * SocialProof Component
 * Displays real-time social proof indicators
 *
 * Psychology principles:
 * - Bandwagon effect: People follow what others do
 * - FOMO (Fear of Missing Out): Urgency increases conversion
 * - Social validation: Others' actions validate choices
 *
 * Industry data:
 * - Social proof: +15% conversion
 * - Urgency messages: +20% conversion when < 20% stock
 * - "X people viewing": +12% engagement
 */
const SocialProof = ({
  bookingsToday = 0,
  viewingNow = 0,
  availability = null, // null = unlimited, number = remaining tickets
  isPopular = false,
  variant = 'default', // 'default' | 'compact' | 'urgent'
}) => {
  const { t } = useTranslation();

  const indicators = [];

  // Bookings Today
  if (bookingsToday > 0) {
    indicators.push({
      key: 'bookings',
      icon: <TrendingIcon fontSize="small" />,
      text: t('social.bookingsToday', {
        count: bookingsToday,
        defaultValue: `${bookingsToday} ${bookingsToday === 1 ? 'persoon' : 'mensen'} boekte${bookingsToday === 1 ? '' : 'n'} vandaag`,
      }),
      color: 'success',
      priority: 1,
    });
  }

  // Viewing Now
  if (viewingNow > 0 && viewingNow <= 50) { // Only show if believable number
    indicators.push({
      key: 'viewing',
      icon: <ViewIcon fontSize="small" />,
      text: t('social.viewingNow', {
        count: viewingNow,
        defaultValue: `${viewingNow} ${viewingNow === 1 ? 'persoon bekijkt' : 'mensen bekijken'} nu`,
      }),
      color: 'info',
      priority: 2,
    });
  }

  // Low Availability (Urgency)
  if (availability !== null && availability > 0) {
    const percentageLeft = availability;
    const isLowStock = availability < 20; // Urgency threshold
    const isVeryLowStock = availability < 10;

    if (isVeryLowStock) {
      indicators.push({
        key: 'urgency',
        icon: <WarningIcon fontSize="small" />,
        text: t('social.almostSoldOut', {
          count: availability,
          defaultValue: `Bijna uitverkocht! Nog ${availability} beschikbaar`,
        }),
        color: 'error',
        priority: 0, // Highest priority
        urgent: true,
      });
    } else if (isLowStock) {
      indicators.push({
        key: 'low-stock',
        icon: <WarningIcon fontSize="small" />,
        text: t('social.lowAvailability', {
          count: availability,
          defaultValue: `Beperkt beschikbaar - nog ${availability} tickets`,
        }),
        color: 'warning',
        priority: 1,
      });
    }
  }

  // Popular Choice
  if (isPopular) {
    indicators.push({
      key: 'popular',
      icon: <HotIcon fontSize="small" />,
      text: t('social.popularChoice', 'Populaire keuze'),
      color: 'secondary',
      priority: 3,
    });
  }

  // Sort by priority
  indicators.sort((a, b) => a.priority - b.priority);

  // Limit in compact mode
  const visibleIndicators = variant === 'compact' ? indicators.slice(0, 2) : indicators;

  if (visibleIndicators.length === 0) {
    return null;
  }

  // Urgent variant - show only most urgent
  if (variant === 'urgent') {
    const mostUrgent = indicators.find(i => i.urgent) || indicators[0];
    if (!mostUrgent) return null;

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: 'error.lighter',
          borderRadius: 1,
          border: 1,
          borderColor: 'error.main',
        }}
        role="status"
        aria-live="polite"
        aria-label={mostUrgent.text}
      >
        {mostUrgent.icon}
        <Typography
          variant="caption"
          sx={{
            color: 'error.dark',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {mostUrgent.text}
        </Typography>
      </Box>
    );
  }

  // Default/Compact variant
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        alignItems: 'center',
      }}
      role="list"
      aria-label={t('social.socialProof', 'Social proof indicators')}
    >
      {visibleIndicators.map((indicator) => (
        <Chip
          key={indicator.key}
          icon={indicator.icon}
          label={indicator.text}
          size="small"
          color={indicator.color}
          variant={indicator.urgent ? 'filled' : 'outlined'}
          sx={{
            fontWeight: indicator.urgent ? 600 : 400,
            fontSize: '0.75rem',
            height: variant === 'compact' ? 24 : 28,
            '& .MuiChip-icon': {
              fontSize: 16,
            },
            ...(indicator.urgent && {
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  opacity: 1,
                },
                '50%': {
                  opacity: 0.8,
                },
              },
            }),
          }}
          role="listitem"
          aria-label={indicator.text}
        />
      ))}
    </Box>
  );
};

export default SocialProof;
