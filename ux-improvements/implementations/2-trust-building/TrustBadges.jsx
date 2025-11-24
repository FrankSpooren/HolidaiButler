import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckIcon,
  EventAvailable as EventIcon,
  Verified as VerifiedIcon,
  LocalOffer as OfferIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * TrustBadges Component
 * Displays trust signals as badges (free cancellation, verified, etc.)
 *
 * Industry data:
 * - Free cancellation badge: +20% conversion
 * - Verified badge: +15% trust score
 * - Best price guarantee: +12% conversion
 */
const TrustBadges = ({
  hasFreeCancellation = false,
  isInstantConfirmation = false,
  isVerified = false,
  hasBestPrice = false,
  hasSecurePayment = true,
  variant = 'default', // 'default' | 'compact' | 'detailed'
  orientation = 'horizontal', // 'horizontal' | 'vertical'
}) => {
  const { t } = useTranslation();

  const badges = [];

  if (hasFreeCancellation) {
    badges.push({
      key: 'free-cancellation',
      icon: <CheckIcon />,
      label: t('trust.freeCancellation', 'Gratis annuleren'),
      tooltip: t('trust.freeCancellationDetails', 'Annuleer tot 24 uur voor aanvang voor volledige terugbetaling'),
      color: 'success',
      priority: 1,
    });
  }

  if (isInstantConfirmation) {
    badges.push({
      key: 'instant-confirmation',
      icon: <EventIcon />,
      label: t('trust.instantConfirmation', 'Direct bevestigd'),
      tooltip: t('trust.instantConfirmationDetails', 'Ontvang direct je tickets na betaling'),
      color: 'info',
      priority: 2,
    });
  }

  if (isVerified) {
    badges.push({
      key: 'verified',
      icon: <VerifiedIcon />,
      label: t('trust.verified', 'Geverifieerd'),
      tooltip: t('trust.verifiedDetails', 'Geverifieerde aanbieder met kwaliteitsgarantie'),
      color: 'primary',
      priority: 3,
    });
  }

  if (hasBestPrice) {
    badges.push({
      key: 'best-price',
      icon: <OfferIcon />,
      label: t('trust.bestPrice', 'Beste prijs'),
      tooltip: t('trust.bestPriceDetails', 'Wij garanderen de beste prijs of we betalen het verschil terug'),
      color: 'warning',
      priority: 4,
    });
  }

  if (hasSecurePayment) {
    badges.push({
      key: 'secure-payment',
      icon: <LockIcon />,
      label: t('trust.securePayment', 'Veilig betalen'),
      tooltip: t('trust.securePaymentDetails', 'SSL versleutelde betalingen via Adyen'),
      color: 'default',
      priority: 5,
    });
  }

  // Sort by priority
  badges.sort((a, b) => a.priority - b.priority);

  // Limit badges in compact mode
  const visibleBadges = variant === 'compact' ? badges.slice(0, 3) : badges;

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        flexWrap: orientation === 'horizontal' ? 'wrap' : 'nowrap',
        gap: 1,
        alignItems: orientation === 'vertical' ? 'flex-start' : 'center',
      }}
      role="list"
      aria-label={t('trust.trustBadges', 'Trust and security badges')}
    >
      {visibleBadges.map((badge) => {
        const chipSize = variant === 'compact' ? 'small' : 'medium';

        const chip = (
          <Chip
            key={badge.key}
            icon={badge.icon}
            label={badge.label}
            size={chipSize}
            color={badge.color}
            variant={variant === 'detailed' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 500,
              cursor: variant === 'detailed' ? 'help' : 'default',
              ...(variant === 'compact' && {
                '& .MuiChip-icon': {
                  fontSize: 16,
                },
                height: 24,
              }),
              ...(orientation === 'vertical' && {
                width: '100%',
                justifyContent: 'flex-start',
              }),
            }}
            role="listitem"
            aria-label={`${badge.label}: ${badge.tooltip}`}
          />
        );

        // Wrap in tooltip if variant is detailed or default
        if (variant === 'detailed' || variant === 'default') {
          return (
            <Tooltip
              key={badge.key}
              title={badge.tooltip}
              arrow
              placement="top"
            >
              <span>{chip}</span>
            </Tooltip>
          );
        }

        return chip;
      })}
    </Box>
  );
};

export default TrustBadges;
