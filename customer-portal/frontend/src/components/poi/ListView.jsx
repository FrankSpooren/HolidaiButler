/**
 * ListView - List Display for POI Items
 *
 * Features:
 * - Horizontal card layout with image on left
 * - More detailed information display
 * - Responsive design (stacks on mobile)
 * - Favorite toggle
 * - Rating and review count
 * - WCAG 2.1 AA Compliant
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardMedia,
  Typography,
  Button,
  Chip,
  IconButton,
  Rating,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Verified as VerifiedIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  AccessTime as TimeIcon,
  Euro as EuroIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ListViewItem = ({ poi, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const [favorite, setFavorite] = useState(false);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setFavorite(!favorite);
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
        '&:focus-within': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${poi.name} - ${poi.category} - ${poi.location}`}
    >
      {/* Image Section */}
      <Box
        sx={{
          position: 'relative',
          width: { xs: '100%', sm: 280 },
          minWidth: { sm: 280 },
          height: { xs: 200, sm: 200 },
        }}
      >
        <CardMedia
          component="img"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          image={poi.image || '/images/placeholder.jpg'}
          alt={poi.name}
        />
        {poi.verified && (
          <Chip
            icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
            label={t('poi.verified', 'Geverifieerd')}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: 'success.main',
              color: 'white',
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        )}
        <IconButton
          onClick={handleFavoriteClick}
          aria-label={favorite
            ? t('poi.removeFromFavorites', 'Verwijder uit favorieten')
            : t('poi.addToFavorites', 'Toevoegen aan favorieten')
          }
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'white',
            '&:hover': { bgcolor: 'white' },
          }}
        >
          {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
        </IconButton>
      </Box>

      {/* Content Section */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, sm: 3 },
        }}
      >
        {/* Header: Category & Title */}
        <Box>
          <Chip
            label={poi.category}
            size="small"
            sx={{ mb: 1.5, fontWeight: 500 }}
          />
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {poi.name}
          </Typography>
        </Box>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {poi.location}
          </Typography>
        </Box>

        {/* Description */}
        {poi.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {poi.description}
          </Typography>
        )}

        {/* Rating & Reviews */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Rating value={poi.rating || 0} readOnly size="small" precision={0.1} />
          <Typography variant="body2" fontWeight={600}>
            {poi.rating?.toFixed(1) || '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({poi.reviewCount || 0} {t('poi.reviews', 'reviews')})
          </Typography>
        </Box>

        {/* Meta Info */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          {poi.duration && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {poi.duration}
              </Typography>
            </Box>
          )}
          {poi.priceLevel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EuroIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {'\u20AC'.repeat(poi.priceLevel)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Footer: Price & CTA */}
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            {poi.price ? (
              <>
                <Typography variant="h5" color="primary" fontWeight={700}>
                  {'\u20AC'}{poi.price}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('poi.perPerson', 'per persoon')}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="success.main" fontWeight={600}>
                {t('poi.free', 'Gratis')}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            size={isMobile ? 'small' : 'medium'}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {t('poi.viewDetails', 'Bekijk')}
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

const ListView = ({ pois = [], onItemClick }) => {
  const navigate = useNavigate();

  const handleClick = (poi) => {
    if (onItemClick) {
      onItemClick(poi);
    } else {
      navigate(`/experiences/${poi.id}`);
    }
  };

  if (pois.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {pois.map((poi) => (
        <ListViewItem
          key={poi.id}
          poi={poi}
          onClick={() => handleClick(poi)}
        />
      ))}
    </Box>
  );
};

export default ListView;
