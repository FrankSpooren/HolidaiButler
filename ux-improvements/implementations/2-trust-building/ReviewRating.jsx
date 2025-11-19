import React from 'react';
import { Box, Typography, Chip, Rating } from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * ReviewRating Component
 * Displays star rating, review count, and verified badge
 *
 * @param {number} rating - Average rating (0-5)
 * @param {number} count - Number of reviews
 * @param {boolean} verified - Has verified reviews
 * @param {function} onClick - Optional click handler to view reviews
 * @param {string} size - 'small' | 'medium' | 'large'
 */
const ReviewRating = ({
  rating = 0,
  count = 0,
  verified = false,
  onClick,
  size = 'medium',
}) => {
  const { t } = useTranslation();

  // Don't show if no reviews yet
  if (count === 0) {
    return null;
  }

  const sizeConfig = {
    small: {
      starSize: 16,
      typography: 'caption',
      chipSize: 'small',
    },
    medium: {
      starSize: 20,
      typography: 'body2',
      chipSize: 'small',
    },
    large: {
      starSize: 24,
      typography: 'body1',
      chipSize: 'medium',
    },
  };

  const config = sizeConfig[size];

  // Format review count with locale-aware number formatting
  const formattedCount = new Intl.NumberFormat('nl-NL').format(count);

  // Determine rating quality for color
  const getRatingColor = () => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 4.0) return 'info.main';
    if (rating >= 3.0) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          '& .rating-text': {
            textDecoration: 'underline',
          },
        } : {},
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={t('trust.viewReviews', {
        rating,
        count: formattedCount,
        defaultValue: `View ${formattedCount} reviews with average rating ${rating} out of 5`,
      })}
    >
      {/* Numeric Rating Badge */}
      <Chip
        label={rating.toFixed(1)}
        size={config.chipSize}
        sx={{
          bgcolor: getRatingColor(),
          color: 'white',
          fontWeight: 600,
          minWidth: size === 'large' ? 50 : 40,
        }}
        aria-hidden="true"
      />

      {/* Star Rating */}
      <Rating
        value={rating}
        precision={0.1}
        readOnly
        size={size}
        icon={<StarIcon fontSize="inherit" />}
        emptyIcon={<StarBorderIcon fontSize="inherit" />}
        aria-label={t('trust.ratingOutOf5', {
          rating,
          defaultValue: `${rating} out of 5 stars`,
        })}
        sx={{
          '& .MuiRating-iconFilled': {
            color: getRatingColor(),
          },
        }}
      />

      {/* Review Count */}
      <Typography
        variant={config.typography}
        className="rating-text"
        sx={{ color: 'text.secondary' }}
      >
        ({formattedCount})
      </Typography>

      {/* Verified Badge */}
      {verified && (
        <Chip
          icon={<VerifiedIcon />}
          label={t('trust.verified', 'Verified')}
          size={config.chipSize}
          variant="outlined"
          color="primary"
          sx={{
            height: size === 'small' ? 20 : 24,
            '& .MuiChip-icon': {
              fontSize: size === 'small' ? 14 : 16,
            },
          }}
          aria-label={t('trust.verifiedReviews', 'Verified reviews from real customers')}
        />
      )}
    </Box>
  );
};

export default ReviewRating;
